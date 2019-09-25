require('dotenv').config();

const pptr = require('puppeteer');
const mongoose = require('mongoose');
const Product = require('./models/Product');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useFindAndModify: true,
    });

    console.log('Successfuly connected to the database!');
  } catch (e) {
    console.log(
      'Something went wrong when trying to connect to the database: ',
      e
    );
    process.exit(0);
  }

  const browser = await pptr.launch({
    headless: false,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null,
  });
  const page = await browser.newPage();
  const productPages = [
    'https://www.pccomponentes.com/placas-base/intel-z370/intel-z390',
    'https://www.pccomponentes.com/procesadores/socket-1151-gen-8',
    'https://www.pccomponentes.com/discos-duros/conexiones-m-2/disco-ssd/sata-3',
    'https://www.pccomponentes.com/tarjetas-graficas/gf-1070-series/gf-1080-series/gf-2070-series/gf-2080-series',
    'https://www.pccomponentes.com/memorias-ram/16-gb/ddr4/dimm',
    'https://www.pccomponentes.com/fuentes-alimentacion/fuente-modular',
    'https://www.pccomponentes.com/refrigeracion-liquida/socket-1151-gen-8',
  ];

  try {
    for (let i = 0; i < productPages.length; i++) {
      let keepGoing = true;

      await page.goto(productPages[i], {
        waitUntil: 'networkidle0',
      });

      while (keepGoing) {
        const loadMoreBtnDisplay = await page.$eval('#btnMore', btn => {
          return window.getComputedStyle(btn).getPropertyValue('display');
        });
        const loadMoreBtn = await page.$('#btnMore');

        if (loadMoreBtnDisplay === 'none') {
          keepGoing = false;
        } else {
          loadMoreBtn.click();
          await page.waitFor(1000);
        }
      }

      const items = await page.$$('.tarjeta-articulo');

      for (let item of items) {
        const productData = await item.$eval(
          'header.tarjeta-articulo__nombre h3 a',
          element => {
            const data = {
              sku: element.getAttribute('data-id'),
              name: element.getAttribute('data-name'),
              price: element.getAttribute('data-price'),
              category: element.getAttribute('data-category'),
              brand: element.getAttribute('data-brand'),
              url: element.href,
            };

            return data;
          }
        );
        const stock = await item.$eval(
          '[itemprop="offers"] > [itemprop="availability"]',
          element => {
            const data = {
              stock: element.getAttribute('content') || '',
            };

            return data;
          }
        );

        Object.assign(productData, stock);

        const existingProduct = await Product.findOne({
          sku: productData.sku,
        });

        if (existingProduct) {
          if (productData.price > existingProduct.highestPrice) {
            productData.highestPrice = productData.price;
          }

          if (productData.price < existingProduct.lowestPrice) {
            productData.lowestPrice = productData.price;
          }

          await Product.findOneAndUpdate({ sku: productData.sku }, productData);
        } else {
          productData.lowestPrice = productData.price;
          productData.highestPrice = productData.price;

          await Product.create(productData);
        }
      }
    }

    await browser.close();
    process.exit(0);
  } catch (e) {
    console.log('error: ', e);
  }
})();
