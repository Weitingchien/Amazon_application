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

module.exports.list = async (event, context, callback) => {
  const books = await client.scan({ TableName }).promise();
  return books.Items;
};

function getBestsellerListOfTenlong() {
  return axios.get(
    'https://www.tenlong.com.tw/zh_tw/recent_bestselling?range=7'
  );
}

function getBestsellerListOfEslite() {
  return axios.get(
    'https://athena.eslite.com/api/v1/banners/L2Page/110/hot_topic,keywords,emphasize_recommend,big_b,focus_event,recommend_new_products,recommend_of_the_day,editor_recommend,main_topic_project,recommend_by_category,main_prompt_products,hot_topic_little_b,exhibition_little_b'
  );
}

module.exports.scrape = async (event, context, callback) => {
  /*
  const books = await client.scan({ TableName }).promise();
  await client.batchWriteItem({
    RequestItems: {}
  });
  */
  const booksOfTenlong = [];
  const bookstoreName = ['天瓏網路書店', '誠品'];
  Promise.all([getBestsellerListOfTenlong(), getBestsellerListOfEslite()]).then(
    async res => {
      let $ = cheerio.load(res[0].data);
      let bookList = $('.list-wrapper ul li');
      // 天瓏網路書店
      for (let i = 0; i < 25; i++) {
        const title = bookList.eq(i).find('.title a').text();
        let rank = i + 1;
        let link = bookList.eq(i).find('a').attr('href');
        link = `https://www.tenlong.com.tw${link}`;

        booksOfTenlong.push({
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
      console.log(`天瓏書店: ${booksOfTenlong}`);

      // 誠品
      const booksOfEslite = [];
      const filterBooks = res[1].data.filter(item => {
        if (item.banner_type === 'recommend_new_products') {
          return item.products;
        }
      });

      for (let i = 0; i < filterBooks[0].products.length; i++) {
        let rank = i + 26;
        booksOfEslite.push({
          PutRequest: {
            Item: {
              id: { S: filterBooks[0].products[i].product_guid },
              top: { S: `${rank}` },
              title: { S: filterBooks[0].products[i].name },
              link: { S: filterBooks[0].products[i].product_link },
              source: { S: bookstoreName[1] }
            }
          }
        });
      }
      console.log(`誠品: ${booksOfEslite}`);

      try {
        const params = {
          RequestItems: {
            bookstore: booksOfTenlong
          }
        };

        const bookStoreOfTenlong = await dynamodb
          .batchWriteItem(params)
          .promise();
        params.RequestItems.bookstore = booksOfEslite;
        const bookStoreOfEslite = await dynamodb
          .batchWriteItem(params)
          .promise();
        const result = { bookStoreOfTenlong, bookStoreOfEslite };
        return result;
      } catch (err) {
        return err;
      }

      /*
      1. There are more than 25 requests in the batch.
      2. Any individual item in a batch exceeds 400 KB.
      3. The total request size exceeds 16 MB.
    */

      //return response;
      //callback(null, books);
    }
  );

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

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
