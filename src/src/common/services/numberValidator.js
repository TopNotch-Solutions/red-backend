function numberValidator(phoneNumber) {
    phoneNumber = phoneNumber.trim();
    
    const regex = /^(081|085)\d{7}$|^\+264(81|85)\d{7}$/;
    
    return regex.test(phoneNumber);
}

module.exports = numberValidator;