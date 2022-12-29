'use strict';

const AWS = require('aws-sdk');
const axios = require('axios');
const cheerio = require('cheerio');
const db = new AWS.DynamoDB.DocumentClient();
//const TableName = process.env.TABLE_NAME;

function getBestsellerList() {
  return axios.get(
    'https://www.tenlong.com.tw/zh_tw/recent_bestselling?range=7'
  );
}

module.exports.scrape = (event, context, callback) => {
  const books = [];
  Promise.all([getBestsellerList()]).then(async res => {
    //console.log(res[0].data);
    const $ = cheerio.load(res[0].data);
    //console.log($);
    const bookList = $('.list-wrapper ul li');

    for (let i = 0; i < bookList.length; i++) {
      //const bookLi = bookList.eq(i).find('li');
      const title = bookList.eq(i).find('.title a').text();
      let link = bookList.eq(i).find('a').attr('href');
      link = `https://www.tenlong.com.tw${link}`;
      books.push({ title, link });
    }
    //console.log(books);
    let response = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully saved data',
        data: books
      })
    };
    try {
      await db.put(books).promise();
    } catch (err) {
      response = {
        statusCode: 500,
        body: JSON.stringify({
          message: 'An error occurred',
          data: err
        })
      };
    }
    return response;
    //callback(null, response);
  });

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
