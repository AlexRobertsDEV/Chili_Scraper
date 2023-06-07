const { Cluster } = require('puppeteer-cluster');
const ExcelJS = require('exceljs');
const fs = require('fs');
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const urls = require('./master_chili_links.js'); // Adjust the file path if necessary

(async () => {
  const results = [];
  const errors = [];

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 5,
    puppeteerOptions: {
      headless: true
    }
  });

  await cluster.task(async ({ page, data: url }) => {
    try {
      await page.goto(url);
  
      // Check if the username and password fields are present
      const usernameField = await page.$('#username');
      const passwordField = await page.$('#password');
      const loginButton = await page.$('#login-form > form > table > tbody > tr:nth-child(5) > td:nth-child(2) > input[type=submit]');
  
      let alreadyLogged = false;

      // Inside the if-else block
      if (usernameField && passwordField && loginButton) {
        // If the fields are present, perform the login
        await usernameField.type('aroberts');
        console.log('Username entered.');
      
        await passwordField.type('Orange9!');
        console.log('Password entered.');
      
        await loginButton.click();
        console.log('Login successful.');
      } else {
        // Check if the message has already been logged
        if (!alreadyLogged) {
          //console.log('Skipping login. User is already logged in.');
          alreadyLogged = true; // Update the boolean variable to indicate the message has been logged
        }
      }

      // Business Name
      await page.waitForSelector('#content > div.issue.details > h1');
      const businessNameElement = await page.$('#content > div.issue.details > h1');
      const businessName = await businessNameElement.evaluate(element => element.textContent);
      //console.log(`Business Name: ${businessName}`);

      // GPID
      await page.waitForSelector('#content > div.issue.details > div.meta > table > tbody > tr:nth-child(7) > td:nth-child(2)');
      const gpidElement = await page.$('#content > div.issue.details > div.meta > table > tbody > tr:nth-child(7) > td:nth-child(2)');
      const gpidName = await gpidElement.evaluate(element => element.textContent);
      //console.log(`GPID: ${gpidName}`);

      // Chili ID
      // Extract only the numbers using regular expression
      const chili_id = businessName.match(/#\d+/)[0];
      //console.log(`Chili ID: ${chili_id}`);

      // Package Service Key
      await page.waitForSelector('#content > div.issue.details > div.meta > table > tbody > tr:nth-child(25) > td:nth-child(2)');
      const packageServiceKeyElement = await page.$('#content > div.issue.details > div.meta > table > tbody > tr:nth-child(25) > td:nth-child(2)');
      const packageServiceKeyName = await packageServiceKeyElement.evaluate(element => element.textContent);
      //console.log(`Package Service Key: ${packageServiceKeyName}`);

      // Live URL
      await page.waitForSelector('#content > div.issue.details > div.meta > table > tbody > tr:nth-child(42) > td:nth-child(2)');
      const liveUrlElement = await page.$('#content > div.issue.details > div.meta > table > tbody > tr:nth-child(42) > td:nth-child(2)');
      const liveUrlName = await liveUrlElement.evaluate(element => element.textContent);
      //console.log(`Live URL: ${liveUrlName}`);

      // Important Logins
      await page.waitForSelector('#content > div.issue.details > div.meta > table > tbody > tr:nth-child(73) > td:nth-child(2)');
      const importantLoginsElement = await page.$('#content > div.issue.details > div.meta > table > tbody > tr:nth-child(73) > td:nth-child(2)');
      const importantLoginsName = await importantLoginsElement.evaluate(element => element.textContent);
      //console.log(`Important Logins: ${importantLoginsName}`);

      // Monthly Package Quote
      await page.waitForSelector('#content > div.issue.details > div.meta > table > tbody > tr:nth-child(86) > td:nth-child(2)');
      const mpqElement = await page.$('#content > div.issue.details > div.meta > table > tbody > tr:nth-child(86) > td:nth-child(2)');
      const mpqName = await mpqElement.evaluate(element => element.textContent);
      //console.log(`Monthly Package Quote: ${mpqName}`);

      // TIMESTAMP
      const now = new Date();
      const timestamp = now.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      console.log(`URL: ${url}, Timestamp: ${timestamp}`);

      /* THE JSON OBJECT WE'RE GOING TO PUSH TO EXCEL */
      const data = {
        'Business': businessName,
        'GPID': gpidName,
        'Chili ID': chili_id,
        'Chili Link': url,
        'Package Service Key': packageServiceKeyName,
        'Live URL': liveUrlName,
        'Important Logins': importantLoginsName,
        'Monthly Package Quote': mpqName,
        'Timestamp': timestamp,
      };

      /* THE END OF THE INDIVIDUAL SCRAPE PER MASTER CHILI LINK */
      results.push(data);
    } catch (error) {
      // If an error occurs, push the URL to errors
      errors.push(url);
      console.error(`Error scraping URL: ${url}`);
      console.error(error);
    }
  });

  for (const url of urls) {
    cluster.queue(url);
  }

  await cluster.idle();
  await cluster.close();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('non-site_clients_GA4.xlsx'); // Load the existing file

  const worksheet = workbook.getWorksheet('Sheet1');

  const headers = ['Business', 'GPID', 'Chili ID', 'Chili Link', 'Package Service Key', 'Live URL', 'Important Logins', 'Monthly Package Quote', 'Timestamp'];
  
  // Add headers only if the worksheet is empty
  if (worksheet.rowCount === 0) {
    worksheet.addRow(headers);
  }

  for (const item of results) {
    const rowValues = Object.values(item);
    worksheet.addRow(rowValues);
  }

  await workbook.xlsx.writeFile('non-site_clients_GA4.xlsx');

  // Write error URLs to a file
  const errorFilePath = './error_results.txt';
  fs.writeFileSync(errorFilePath, errors.join('\n'));
  console.log('ALL DONE! THANK YOU FOR SCRAPING WITH ALEX!!!!!!!');
})();