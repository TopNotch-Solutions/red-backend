const TransactionModel = require('../../common/models/TransactionModel')
const usersModel = require('../../common/models/usersModel')
const PaymentsModel = require('../../common/models/paymentsModel')
const { isEmpty } = require('../../common/services/utils')
const fs = require('fs').promises
const path = require('path')
const admin = require('firebase-admin')
const NotificationsModel = require('../../portal/models/NotificationsModel');
const UserNotifications = require('../../common/models/UsersNotificationModel');
const FcmTokensModel = require('../../common/models/fcmTokensModel')
const ReceiptsModel = require('../../common/models/receiptsModel')
const User = require('../models/UserModel')
const RECEIPTS_DIR = 'documents/receipts/'
const logoFilename = 'erongred-logo.png';
const absoluteLogoPath = path.join(__dirname, '..', '..', '..', 'assets', 'imgs', logoFilename);
const sequelize = require('../../config/db')

exports.transactions = async (req, res) => {
    try {
        const transactions = await TransactionModel.findAll({
            order: [['createdAt', 'DESC']]
        })

        res.status(200).json({
            status: 'success',
            message: 'Transaction retrieved successfully',
            transactions
        })
    } catch (error) {
        console.error('Error', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.transactionByUser = async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({
            status: 400,
            message: 'User ID is required'
        })
    }

    try {
        const transactions = await TransactionModel.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        })

        const user = await usersModel.findOne({
            where: {
                id: userId,
                userType: 'AppUser'
            }
        })

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }

        if (!transactions.length) {
            return res.status(404).json({
                message: 'No transactions found for this user',
                transactions
            })
        }
        res.status(200).json({
            message: 'Transactions retrieved successfully',
            transactions
        })
    } catch (error) {
        console.error('Error fetching user transactions:', error)
        res.status(500).json({
            status: 'FAILED',
            message: 'Internal Server error' + error.message
        })
    }
}

exports.transactionStats = async (req, res) => {
    try {
        const transactionAmount = await TransactionModel.sum('amount')
        const transactionCount = await TransactionModel.count()

        res.status(200).json({
            status: 'SUCCESS',
            message: 'Transaction amount retrieved successfully',
            transactionAmount,
            transactionCount
        })

    } catch (error) {
        console.error('Error', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

exports.getPendingPayments = async (req, res) => {
    try {
        const pendingPayments = await PaymentsModel.findAll({
            order: [['date', 'DESC']],
		include: [
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName', 'email'] }
    ]
        })

        if (!pendingPayments.length) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'No pending payments found'
            })
        }
        res.status(200).json({
            status: 'success',
            message: 'Pending payments retrieved successfully',
            pendingPayments
        })
    } catch (error) {
        console.error('Error fetching pending payments:', error)
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error' + error.message
        })
    }
}

async function fileToBase64(filePath) {
    try {
        const fileBuffer = await fs.readFile(filePath);
        const fileExtension = path.extname(filePath).toLowerCase();
        let mimeType;

        switch (fileExtension) {
            case '.png':
                mimeType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                mimeType = 'image/jpeg';
                break;
            case '.svg':
                mimeType = 'image/svg+xml';
                break;
            default:
                throw new Error('Unsupported file type for Base64 conversion.');
        }

        return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    } catch (error) {
        console.error(`Error converting file to Base64: ${error.message}`);
        return null;
    }
}

exports.completePayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
	const userId = req.user.id;

        if (!paymentId || isEmpty(paymentId)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'Payment ID is required'
            });
        }
if (!userId || isEmpty(userId)) {
            return res.status(400).json({
                status: 'FAILED',
                message: 'User ID is required'
            });
        }
	const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'User not found'
            });
        }
        const payment = await PaymentsModel.findByPk(paymentId);

        if (!payment) {
            return res.status(404).json({
                status: 'FAILED',
                message: 'Payment not found'
            });
        }

        if (payment.status === 'completed') {
            return res.status(200).json({
                status: 'SUCCESS',
                message: 'Payment already completed'
            });
        }

        payment.status = 'completed';
	payment.approvedBy = user.id;
        await payment.save();

        let deviceTokens = [];

        try {
            const notificationTitle = 'Payment Completed';
            const notificationMessage = `Your payment of ${payment.amount} has been successfully completed.`;

            const newNotification = await NotificationsModel.create({
                title: notificationTitle,
                message: notificationMessage,
                notificationType: 'payment_confirmation'
            });

            await UserNotifications.create({
                userId: payment.userId,
                notificationId: newNotification.id,
                isRead: false,
                notificationType: 'payment_confirmation'
            });
            console.log('Successfully stored notification in database.');

            const fcmTokenRecords = await FcmTokensModel.findAll({
                where: { userId: payment.userId },
                attributes: ['fcmToken']
            });

            if (fcmTokenRecords && fcmTokenRecords.length > 0) {
                deviceTokens = fcmTokenRecords.map(record => record.fcmToken);
            } else {
                console.warn('No FCM tokens found for user:', payment.userId);
            }
        } catch (dbError) {
            console.error('Error storing notification or fetching tokens from database:', dbError);
        }

        if (deviceTokens.length > 0) {
            const message = {
                notification: {
                    title: 'Payment Completed',
                    body: `Your payment of ${payment.amount} has been successfully completed.`,
                },
                data: {
                    type: 'Payment',
                    paymentId: payment.id,
                },
                tokens: deviceTokens
            };

            try {
                const response = await admin.messaging().sendEachForMulticast(message);
                console.log(`${response.successCount} push notifications sent successfully`);

                await Promise.all(
                    response.responses.map(async (res, i) => {
                        const token = message.tokens[i];
                        if (!res.success) {
                            const errorCode = res.error?.errorInfo?.code;
                            console.error(`Token ${token} failed:`, res.error);

                            if (
                                errorCode === 'messaging/registration-token-not-registered' ||
                                errorCode === 'messaging/invalid-argument'
                            ) {
                                console.log(`🧹 Dead token cleaned: ${token}`);
                            }
                        }
                    })
                );
            } catch (notificationError) {
                console.error('Error sending push notifications:', notificationError);
            }
        }

        // Return success response
        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Payment completed successfully',
        });

    } catch (error) {
        console.error('Error completing payment:', error);
        return res.status(500).json({
            status: 'FAILED',
            message: 'Internal server error: ' + error.message
        });
    }
};

exports.getTransactionStatisticsByLocation = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    // ------------------- TRANSACTIONS PER TOWN -------------------
    const transactionsPerTown = await sequelize.query(`
      WITH years AS (
        SELECT ${currentYear} AS yr
        UNION ALL
        SELECT ${previousYear}
      )
      SELECT 
        twn.town,
        y.yr AS year,
        COUNT(tr.id) AS totalTransactions
      FROM towns twn
      CROSS JOIN years y
      LEFT JOIN users u 
        ON u.town COLLATE utf8mb4_general_ci = twn.town COLLATE utf8mb4_general_ci
      LEFT JOIN transactions tr 
        ON tr.userId = u.id 
        AND YEAR(tr.createdAt) = y.yr
      GROUP BY twn.town, y.yr
      ORDER BY twn.town ASC, y.yr DESC
    `);

    // ------------------- TRANSACTIONS PER SUBURB -------------------
    const transactionsPerSuburb = await sequelize.query(`
      WITH years AS (
        SELECT ${currentYear} AS yr
        UNION ALL
        SELECT ${previousYear}
      )
      SELECT 
        sub.suburb,
        y.yr AS year,
        COUNT(tr.id) AS totalTransactions
      FROM suburbs sub
      CROSS JOIN years y
      LEFT JOIN users u 
        ON u.suburb_name COLLATE utf8mb4_general_ci = sub.suburb COLLATE utf8mb4_general_ci
      LEFT JOIN transactions tr 
        ON tr.userId = u.id 
        AND YEAR(tr.createdAt) = y.yr
      GROUP BY sub.suburb, y.yr
      ORDER BY sub.suburb ASC, y.yr DESC
    `);

    // ------------------- TOP 5 TOWNS -------------------
    const topTowns = await sequelize.query(`
      SELECT 
        u.town,
        COUNT(tr.id) AS totalTransactions
      FROM transactions tr
      JOIN users u 
        ON u.id = tr.userId
      WHERE YEAR(tr.createdAt) IN (${currentYear}, ${previousYear})
      GROUP BY u.town
      ORDER BY totalTransactions DESC
      LIMIT 5
    `);

    // ------------------- TOP 5 SUBURBS -------------------
    const topSuburbs = await sequelize.query(`
      SELECT 
        u.suburb_name AS suburb,
        COUNT(tr.id) AS totalTransactions
      FROM transactions tr
      JOIN users u 
        ON u.id = tr.userId
      WHERE u.suburb_name IS NOT NULL
        AND YEAR(tr.createdAt) IN (${currentYear}, ${previousYear})
      GROUP BY u.suburb_name
      ORDER BY totalTransactions DESC
      LIMIT 5
    `);

    return res.status(200).json({
      status: "SUCCESS",
      data: {
        transactionsPerTown: transactionsPerTown[0],
        transactionsPerSuburb: transactionsPerSuburb[0],
        topTowns: topTowns[0],
        topSuburbs: topSuburbs[0]
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch towns and suburbs transactions"
    });
  }
};

// exports.completePayment = async (req, res) => {
//     try {
//         const { paymentId } = req.params;

//         if (!paymentId || isEmpty(paymentId)) {
//             return res.status(400).json({
//                 status: 'FAILED',
//                 message: 'Payment ID is required'
//             });
//         }

//         const payment = await PaymentsModel.findByPk(paymentId);

//         if (!payment) {
//             return res.status(404).json({
//                 status: 'FAILED',
//                 message: 'Payment not found'
//             });
//         }

//         if (payment.status === 'completed') {
//             return res.status(200).json({
//                 status: 'SUCCESS',
//                 message: 'Payment already completed'
//             });
//         }

//         payment.status = 'completed';
//         await payment.save();

//         let userDetails = {};
//         let deviceTokens = [];

//         try {
//             const user = await usersModel.findByPk(payment.userId);
//             if (user) {
//                 userDetails = {
//                     fullName: `${user.firstName} ${user.lastName}`,
//                     email: user.email
//                 };
//             }
//         } catch (fetchError) {
//             console.error('Error fetching user details for receipt:', fetchError);
//         }

//         try {
//             const notificationTitle = 'Payment Completed';
//             const notificationMessage = `Your payment of ${payment.amount} has been successfully completed.`;

//             const newNotification = await NotificationsModel.create({
//                 title: notificationTitle,
//                 message: notificationMessage,
//                 notificationType: 'payment_confirmation'
//             });

//             await UserNotifications.create({
//                 userId: payment.userId,
//                 notificationId: newNotification.id,
//                 isRead: false,
//                 notificationType: 'payment_confirmation'
//             });
//             console.log('Successfully stored notification in database.');

//             const fcmTokenRecords = await FcmTokensModel.findAll({
//                 where: { userId: payment.userId },
//                 attributes: ['fcmToken']
//             });

//             if (fcmTokenRecords && fcmTokenRecords.length > 0) {
//                 deviceTokens = fcmTokenRecords.map(record => record.fcmToken);
//             } else {
//                 console.warn('No FCM tokens found for user:', payment.userId);
//             }
//         } catch (dbError) {
//             console.error('Error storing notification or fetching tokens from database:', dbError);
//         }

//         if (deviceTokens.length > 0) {
//             const message = {
//                 notification: {
//                     title: 'Payment Completed',
//                     body: `Your payment of ${payment.amount} has been successfully completed.`,
//                 },
//                 data: {
//                     type: 'Payment',
//                     paymentId: payment.id,
//                 },
//                 tokens: deviceTokens
//             };

//             try {
//                 const response = await admin.messaging().sendEachForMulticast(message);
//                 console.log(`${response.successCount} push notifications sent successfully`);

//                 await Promise.all(
//                     response.responses.map(async (res, i) => {
//                         const token = message.tokens[i];
//                         if (!res.success) {
//                             const errorCode = res.error?.errorInfo?.code;
//                             console.error(`Token ${token} failed:`, res.error);

//                             if (
//                                 errorCode === 'messaging/registration-token-not-registered' ||
//                                 errorCode === 'messaging/invalid-argument'
//                             ) {
//                                 console.log(`🧹 Dead token cleaned: ${token}`);
//                             }
//                         }
//                     })
//                 );
//             } catch (notificationError) {
//                 console.error('Error sending push notifications:', notificationError);
//             }
//         }

//         const logoPath = path.join(__dirname, '..', '..', '..', 'assets', 'imgs', logoFilename);
//         const base64Logo = await fileToBase64(logoPath);

//         const receiptHtml = `
//             <!DOCTYPE html>
//             <html lang="en">
//             <head>
//                 <meta charset="UTF-8">
//                 <meta name="viewport" content="width=device-width, initial-scale=1.0">
//                 <title>Erongo Red Payment Receipt</title>
//                 <style>
//                     :root {
//                         --erongo-red: #d21a22;
//                         --erongo-blue: #0a234f;
//                         --text-dark: #333;
//                         --text-light: #f5f5f5;
//                         --border-color: #ddd;
//                         --bg-light: #f9f9f9;
//                     }
//                     body {
//                         font-family: 'Inter', 'Helvetica Neue', 'Arial', sans-serif;
//                         margin: 0;
//                         padding: 0;
//                         color: var(--text-dark);
//                         background-color: #fff;
//                     }
//                     .receipt-container {
//                         max-width: 650px;
//                         margin: 0 auto;
//                         padding: 2rem;
//                         font-size: 10px;
//                     }
//                     .header-section {
//                         text-align: center;
//                         padding-bottom: 1rem;
//                         border-bottom: 1px solid var(--border-color);
//                     }
//                     .logo {
//                         max-width: 200px;
//                     }
//                     .contact-info, .address-info {
//                         display: flex;
//                         justify-content: center;
//                         align-items: center;
//                         flex-wrap: wrap;
//                         gap: 0.5rem;
//                         margin: 0;
//                         padding: 0;
//                         list-style: none;
//                         font-size: 1em;
//                     }
//                     .contact-info li, .address-info li {
//                         display: flex;
//                         align-items: center;
//                     }
//                     .separator {
//                         content: '|';
//                         color: var(--erongo-red);
//                         margin: 0 0.2rem;
//                         font-weight: bold;
//                     }
//                     h2 {
//                         border-bottom: 2px solid var(--border-color);
//                         padding-bottom: 0.5rem;
//                         color: var(--erongo-blue);
//                         margin-top: 1.5rem;
//                         font-weight: 600;
//                     }
//                     .details-grid {
//                         display: flex;
//                         justify-content: space-between;
//                         gap: 2rem;
//                         margin-bottom: 1.5rem;
//                     }
//                     .details-grid div {
//                         flex-basis: 50%;
//                     }
//                     .details-grid p {
//                         margin: 0;
//                         line-height: 1.6;
//                     }
//                     .details-grid strong {
//                         display: inline-block;
//                         font-weight: 600;
//                         color: var(--erongo-blue);
//                         min-width: 100px;
//                     }
//                     .payment-status {
//                         color: var(--erongo-red);
//                         font-weight: bold;
//                         text-transform: uppercase;
//                         font-size: 1.1em;
//                     }
//                     .thank-you {
//                         text-align: center;
//                         margin-top: 2rem;
//                         font-style: italic;
//                         color: #777;
//                         border-top: 1px solid var(--border-color);
//                         padding-top: 1.5rem;
//                     }
//                 </style>
//             </head>
//             <body>
//                 <div class="receipt-container">
//                     <div class="header-section">
//                         <img src="${base64Logo}" alt="Erongo Red Logo" class="logo">
                        
//                         <ul class="contact-info">
//                             <li>TEL +264 (64) 201 9000</li>
//                             <li class="separator">|</li>
//                             <li>TOLL FREE 96000</li>
//                             <li class="separator">|</li>
//                             <li>FAX +264 (64) 201 9001</li>
//                             <li class="separator">|</li>
//                             <li>EMAIL info@erongored.com.na</li>
//                         </ul>
//                         <ul class="address-info">
//                             <li>ERONGO RED BUILDING</li>
//                             <li class="separator">|</li>
//                             <li>REG NO 2004/074</li>
//                             <li class="separator">|</li>
//                             <li>91 HAGE GEINGOB STREET</li>
//                             <li class="separator">|</li>
//                             <li>P O BOX 2925</li>
//                             <li class="separator">|</li>
//                             <li>WALVIS BAY</li>
//                             <li class="separator">|</li>
//                             <li>NAMIBIA</li>
//                         </ul>
//                     </div>

//                     <!-- Main Receipt Body -->
//                     <div class="main-body">
//                         <h2>Payment Receipt</h2>
                        
//                         <div class="details-grid">
//                             <div>
//                                 <p><strong>Customer Name:</strong> ${userDetails.fullName || 'N/A'}</p>
//                                 <p><strong>Email Address:</strong> ${userDetails.email || 'N/A'}</p>
//                             </div>
//                             <div>
//                                 <p><strong>Payment ID:</strong> ${payment.id}</p>
//                                 <p><strong>Reference No:</strong> ${payment.refNo || 'N/A'}</p>
//                             </div>
//                         </div>

//                         <h2>Payment Details</h2>
//                         <div class="details-grid">
//                             <div>
//                                 <p><strong>Amount Paid:</strong> ${payment.amount || 'N/A'}</p>
//                                 <p><strong>Date of Payment:</strong> ${payment.updatedAt ? payment.updatedAt.toDateString() : 'N/A'}</p>
//                             </div>
//                             <div>
//                                 <p><strong>Status:</strong> <span class="payment-status">${payment.status.toUpperCase()}</span></p>
//                             </div>
//                         </div>

//                         <div class="thank-you">
//                             <p>Thank you for your timely payment. Your transaction has been successfully processed.</p>
//                         </div>
//                     </div>
//                 </div>
//             </body>
//             </html>
//         `;

//         const file = { content: receiptHtml };
//         const options = { format: 'A4' };

//         const pdfBuffer = await pdf.generatePdf(file, options);

//         const receiptFileName = `receipt-${payment.id}.pdf`;
//         const filePath = path.join(RECEIPTS_DIR, receiptFileName);

//         await fs.mkdir(RECEIPTS_DIR, { recursive: true });
//         await fs.writeFile(filePath, pdfBuffer);

//         // Store receipt information in database
//         try {
//             await ReceiptsModel.create({
//                 userId: payment.userId,
//                 fileName: receiptFileName,
//                 filePath: filePath
//             });
//             console.log(`Receipt record saved to database: ${receiptFileName}`);
//         } catch (dbError) {
//             console.error('Error saving receipt to database:', dbError);
//         }

//         res.setHeader('Content-Type', 'application/pdf');
//         res.setHeader('Content-Disposition', `attachment; filename="${receiptFileName}"`);
//         res.send(pdfBuffer);

//     } catch (error) {
//         console.error('Error completing payment, generating, or saving receipt:', error);
//         return res.status(500).json({
//             status: 'FAILED',
//             message: 'Internal server error: ' + error.message
//         });
//     }
// };
