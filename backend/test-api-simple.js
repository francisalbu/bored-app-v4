const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/experiences',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('Status:', res.statusCode);
    console.log('Success:', json.success);
    console.log('Experiences count:', json.data.length);
    if (json.data.length > 0) {
      console.log('\nFirst experience:');
      console.log('  Title:', json.data[0].title);
      console.log('  Location:', json.data[0].location);
      console.log('  Price:', json.data[0].price, json.data[0].currency);
      console.log('  Rating:', json.data[0].rating);
    }
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
  process.exit(1);
});

req.end();
