
require("dotenv").config();

const username = process.env.CONNECTSMS_USERNAME;

const password = process.env.CONNECTSMS_PASSWORD;

async function callExternalApi(param1, param4, param5) {
  if (!param1 || !param4 || !param5) {
    throw new Error("Missing required parameters: from_number, destination, or message");
  }

  const url = new URL("https://connectsms.mtc.com.na/SendSMS");
  url.searchParams.append("from_number", param1);
  url.searchParams.append("username", username);
  url.searchParams.append("password", password);
  url.searchParams.append("destination", param4);
  url.searchParams.append("message", param5);

  const sendSms = async () => {
    return await fetch(url, { method: "GET" });
  };

  try {
    let response = await sendSms();
    console.log("sms connect response: ", response, param1, param4, param5)
    if (!response.ok) {

      const errorText = await response.text();

      if (response.status === 404) {
        throw new Error(`Service is currently unavailable. Please try again later or contact system support.`);
      }

      if (response.status === 401) {
        throw new Error("Service is currently unavailable. Please try again later or contact system support.");
      }

      if (response.status === 500) {
        console.warn("Service is currently unavailable. Please try again later or contact system support.");
      }
      response = await sendSms();

      if (!response.ok) {
        const retryText = await response.text();
        throw new Error("Service is currently unavailable. Please try again later or contact system support.");
      }
    }

    const responseText = await response.text();
    console.log("✅ SMS API successful response:", responseText);

    return responseText;

  } catch (error) {
    console.error("Error calling SMS API:", error.message);
    throw new Error("Service is currently unavailable. Please try again later or contact system support.");
  }
}

module.exports = callExternalApi;

