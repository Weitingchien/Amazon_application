'use strict';

const AWS = require('aws-sdk');
const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const client = new AWS.DynamoDB.DocumentClient();
const dynamodb = new AWS.DynamoDB();
const TableName = process.env.TABLE_NAME;
console.log(TableName);
//const TableName = process.env.TABLE_NAME;

/*
module.exports.testWrite = async (event, context, callback) => {
  const book = {
    id: uuidv4(),
    title: 'C++',
    createdAt: new Date().toISOString()
  };

  let response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Successfully saved data',
      data: book
    })
  };

  try {
    await client.put({ TableName, Item: book }).promise();
  } catch (err) {
    response = {
      statusCode: 500,
      body: JSON.stringify({
        message: 'An error occurred',
        data: err
      })
    };
  }
  callback(null, response);
};
*/
module.exports.list = async (event, context, callback) => {
  const books = await client.scan({ TableName }).promise();
  const response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*'
    },
    body: JSON.stringify({
      message: `There are ${books.Count} records `,
      data: books
    })
  };
  //console.log(books.Count);
  callback(null, response);

  //await callback(null, books);
};

function getBestsellerListOfTenlong() {
  return axios.get(
    'https://www.tenlong.com.tw/zh_tw/recent_bestselling?range=7'
  );
}

function getBestsellerListOfEslite() {
  return axios.get(
    'https://www.books.com.tw/web/sys_saletopb/books/?attribute=30'
  );
}

module.exports.scrape = (event, context, callback) => {
  let books = [];
  const bookstoreName = ['天瓏網路書店', '博客來', '誠品'];
  Promise.all([getBestsellerListOfTenlong(), getBestsellerListOfEslite()]).then(
    async res => {
      let $ = cheerio.load(res[0].data);
      //console.log($);
      let bookList = $('.list-wrapper ul li');
      for (let i = 0; i < 25; i++) {
        //const bookLi = bookList.eq(i).find('li');
        const title = bookList.eq(i).find('.title a').text();
        let rank = i + 1;
        let link = bookList.eq(i).find('a').attr('href');
        link = `https://www.tenlong.com.tw${link}`;

        books.push({
          PutRequest: {
            Item: {
              id: { S: uuidv4() },
              top: { S: `${rank}` },
              title: { S: title },
              link: { S: link },
              source: { S: bookstoreName[0] }
            }
          }
        });
      }
      books = [];
      $ = cheerio.load(res[1].data);
      bookList = $('.mod_a ul li');
      console.log(bookList.eq(2).find('.type02_bd-a'));

      for (let j = 0; j < 25; j++) {
        const title = bookList.eq(j).find('.type02_bd-a h4 a').text();
        let rank = j + 1;
        let link = bookList.eq(j).find('.type02_bd-a h4 a').attr('href');
        books.push({
          id: { S: uuidv4() },
          top: { S: `${rank}` },
          title: { S: title },
          link: { S: link },
          source: { S: bookstoreName[1] }
        });
      }
      //console.log(books);

      const params = {
        RequestItems: {
          bookstore: books
        }
      };
      //console.log(books);
      let response = {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Successfully saved data',
          data: books
        })
      };
      /*
      1. There are more than 25 requests in the batch.
      2. Any individual item in a batch exceeds 400 KB.
      3. The total request size exceeds 16 MB.
    */
      /*
      dynamodb.batchWriteItem(params, (err, data) => {
        if (err) {
          response = {
            statusCode: 500,
            body: JSON.stringify({
              message: 'An error occurred',
              data: err
            })
          };
        } else {
          console.log(data);
        }
      });
    */
      //return response;
      callback(null, books);
    }
  );

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
