'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

function getBestsellerList() {
  return axios.get(
    'https://www.tenlong.com.tw/zh_tw/recent_bestselling?range=7'
  );
}

module.exports.scrape = async (event, context, callback) => {
  Promise.all([getBestsellerList()]).then(res => {
    //console.log(res[0].data);
    const $ = cheerio.load(res[0].data);
    //console.log($);
    const bookList = $('.list-wrapper ul');
    for (let i = 0; i < bookList.length; i++) {
      const bookLi = bookList.eq(i).find('li');
      const title = bookLi.find('.title a').text();
      console.log(title);
    }
    console.log(bookList);
    //console.log(bookList);
    callback(null, bookList);
  });

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
