'use strict';

const axios = require('axios');

function getBestsellerList() {
  return axios.get(
    'https://www.tenlong.com.tw/zh_tw/recent_bestselling?range=7'
  );
}

module.exports.scrape = async (event, context, callback) => {
  Promise.all([getBestsellerList()]).then(data => {
    console.log(data);
    callback(null, data[0]);
  });

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
