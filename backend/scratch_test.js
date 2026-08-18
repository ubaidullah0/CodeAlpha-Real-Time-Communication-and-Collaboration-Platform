const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: 'obaidkhan13542@gmail.com', pass: 'yjtvofjeslovjpmx' },
});
transporter.verify(function(error, success) {
  if (error) { console.log('ERROR:', error); }
  else { console.log('Server is ready to take our messages'); }
});
