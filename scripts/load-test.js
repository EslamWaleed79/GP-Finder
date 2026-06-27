import autocannon from 'autocannon';

const url = 'http://localhost:5000/api/users';
const opts = {
  url,
  connections: 50,
  duration: 30,
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log(`🚀 Running load test against ${url}`);

autocannon(opts, (err, res) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log('✅ Load test complete');
  console.log(autocannon.printResult(res));
});
