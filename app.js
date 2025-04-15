require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { connect } = require('./dbConnector'); // Import the MySQL connection pool
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt'); // If using hashed passwords
const jwt = require('jsonwebtoken'); // To generate a token for authenticated users
// List<String> allowed = Arrays.asList("S1930", "H2Ni1", "BG002");
// Secret key for JWT (store securely in production)
const JWT_SECRET = process.env.ACCESS_TOKEN_SECRETE || 'your_jwt_secret';

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const port = process.env.PORT || 3000;
const subscribers = {};

// Serve a basic homepage
app.get('/', (req, res) => {
  res.send('Welcome to the Notification System');
});


// // New endpoint to save transaction data
app.post('/save-savings-transactions', async (req, res) => {
  console.log("Received request at /save-savings-transactions");
  console.log(req.body);
  const {
    TrnDate,
    AccountNumber,
    AccountName,
    SavingsMonth,
    SavingsYear,
    SavingsAdded,
    SavingsRemoved,
    SavingsRunningBalance,
    OtherOne,
    OtherTwo,
    OtherThree,
    OtherFour,
    OtherFive,
    company_name,
    branch_name,
    user_id
  } = req.body;

  // INSERT or UPDATE based on the unique index:
  // (AccountNumber, SavingsMonth, SavingsYear, company_name, branch_name)
  const upsertQuery = `
    INSERT INTO transactions (
      TrnDate,
      AccountNumber,
      AccountName,
      SavingsMonth,
      SavingsYear,
      SavingsAdded,
      SavingsRemoved,
      SavingsRunningBalance,
      OtherOne,
      OtherTwo,
      OtherThree,
      OtherFour,
      OtherFive,
      company_name,
      branch_name,
      user_id,
      created_at
    )
    VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, UTC_TIMESTAMP()
    )
    ON DUPLICATE KEY UPDATE
      TrnDate = VALUES(TrnDate),
      AccountName = VALUES(AccountName),
      SavingsAdded = VALUES(SavingsAdded),
      SavingsRemoved = VALUES(SavingsRemoved),
      SavingsRunningBalance = VALUES(SavingsRunningBalance),
      OtherOne = VALUES(OtherOne),
      OtherTwo = VALUES(OtherTwo),
      OtherThree = VALUES(OtherThree),
      OtherFour = VALUES(OtherFour),
      OtherFive = VALUES(OtherFive),
      user_id = VALUES(user_id),           -- can be updated
      company_name = VALUES(company_name), -- optional, though typically wouldn't change
      branch_name = VALUES(branch_name);   -- optional, though typically wouldn't change
  `;

  try {
    await connect.query(upsertQuery, [
      TrnDate,
      AccountNumber,
      AccountName,
      SavingsMonth,
      SavingsYear,
      SavingsAdded,
      SavingsRemoved,
      SavingsRunningBalance,
      OtherOne,
      OtherTwo,
      OtherThree,
      OtherFour,
      OtherFive,
      company_name,
      branch_name,
      user_id
    ]);

    res.status(200).json({ message: 'Transaction data saved/updated successfully (by company_name & branch_name).' });
  } catch (error) {
    console.error('Error saving or updating transaction data:', error);
    res.status(500).json({ message: 'Server error while saving or updating transaction data.' });
  }
});



// app.post('/save-savings-transactions', async (req, res) => {
//   console.log("Received request at /save-savings-transactions");
//   const {
//     TrnId, TrnDate, AccountNumber, AccountName, SavingsMonth, SavingsYear, SavingsAdded,
//     SavingsRemoved, SavingsRunningBalance, OtherOne, OtherTwo, OtherThree, OtherFour, OtherFive
//   } = req.body;

//   const upsertQuery = `
//     INSERT INTO transactions (
//       TrnId, TrnDate, AccountNumber, AccountName, SavingsMonth, SavingsYear, 
//       SavingsAdded, SavingsRemoved, SavingsRunningBalance, OtherOne, OtherTwo, 
//       OtherThree, OtherFour, OtherFive, created_at
//     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
//     ON DUPLICATE KEY UPDATE 
//       TrnDate=VALUES(TrnDate), AccountName=VALUES(AccountName),
//       SavingsAdded=VALUES(SavingsAdded), SavingsRemoved=VALUES(SavingsRemoved),
//       SavingsRunningBalance=VALUES(SavingsRunningBalance), OtherOne=VALUES(OtherOne),
//       OtherTwo=VALUES(OtherTwo), OtherThree=VALUES(OtherThree),
//       OtherFour=VALUES(OtherFour), OtherFive=VALUES(OtherFive);
//   `;

//   try {
//     await connect.query(upsertQuery, [
//       TrnId, TrnDate, AccountNumber, AccountName, SavingsMonth, SavingsYear,
//       SavingsAdded, SavingsRemoved, SavingsRunningBalance, OtherOne, OtherTwo,
//       OtherThree, OtherFour, OtherFive
//     ]);
//     res.status(200).json({ message: 'Transaction data saved or updated successfully.' });
//   } catch (error) {
//     console.error('Error saving or updating transaction data:', error);
//     res.status(500).json({ message: 'Server error while saving or updating transaction data.' });
//   }
// });


// // // New endpoint to save loan portfolio data
// // New endpoint to save loan portfolio data
// app.post('/save-loan-portfolio', async (req, res) => {
//   console.log("Received request at /save-loan-portfolio");

//   const {
//     loan_id, customer_name, customer_contact, guarantor1_name, guarantor1_contact,
//     guarantor2_name, guarantor2_contact, date_taken, due_date, loan_taken,
//     principal_remaining, interest_remaining, total_remaining, total_inarrears,
//     number_of_days_in_arrears, loan_status
//   } = req.body;

//   const upsertQuery = `
//     INSERT INTO loan_portfolio (
//       loan_id, customer_name, customer_contact, guarantor1_name, guarantor1_contact,
//       guarantor2_name, guarantor2_contact, date_taken, due_date, loan_taken,
//       principal_remaining, interest_remaining, total_remaining, total_inarrears,
//       number_of_days_in_arrears, loan_status
//     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     ON DUPLICATE KEY UPDATE 
//       customer_name=VALUES(customer_name), customer_contact=VALUES(customer_contact),
//       guarantor1_name=VALUES(guarantor1_name), guarantor1_contact=VALUES(guarantor1_contact),
//       guarantor2_name=VALUES(guarantor2_name), guarantor2_contact=VALUES(guarantor2_contact),
//       date_taken=VALUES(date_taken), due_date=VALUES(due_date), loan_taken=VALUES(loan_taken),
//       principal_remaining=VALUES(principal_remaining), interest_remaining=VALUES(interest_remaining),
//       total_remaining=VALUES(total_remaining), total_inarrears=VALUES(total_inarrears),
//       number_of_days_in_arrears=VALUES(number_of_days_in_arrears), loan_status=VALUES(loan_status);
//   `;

//   try {
//     await connect.query(upsertQuery, [
//       loan_id, customer_name, customer_contact, guarantor1_name, guarantor1_contact,
//       guarantor2_name, guarantor2_contact, date_taken, due_date, loan_taken,
//       principal_remaining, interest_remaining, total_remaining, total_inarrears,
//       number_of_days_in_arrears, loan_status
//     ]);
//     res.status(200).json({ message: 'Loan portfolio data saved or updated successfully.' });
//   } catch (error) {
//     console.error('Error saving or updating loan portfolio data:', error);
//     res.status(500).json({ message: 'Server error while saving or updating loan portfolio data.' });
//   }
// });


// New endpoint to save loan portfolio data

app.post('/save-loan-portfolio', async (req, res) => {
  const connection = await connect.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      loan_id,
      customer_name,
      customer_contact,
      guarantor1_name,
      guarantor1_contact,
      guarantor2_name,
      guarantor2_contact,
      date_taken,
      due_date,
      loan_taken,
      principal_remaining,
      interest_remaining,
      total_remaining,
      total_inarrears,
      number_of_days_in_arrears,
      loan_status,
      company_name,
      branch_name,
      user_id
    } = req.body;

    const upsertQuery = `
      INSERT INTO loan_portfolio (
        loan_id,
        customer_name,
        customer_contact,
        guarantor1_name,
        guarantor1_contact,
        guarantor2_name,
        guarantor2_contact,
        date_taken,
        due_date,
        loan_taken,
        principal_remaining,
        interest_remaining,
        total_remaining,
        total_inarrears,
        number_of_days_in_arrears,
        loan_status,
        company_name,
        branch_name,
        user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        customer_name = VALUES(customer_name),
        customer_contact = VALUES(customer_contact),
        guarantor1_name = VALUES(guarantor1_name),
        guarantor1_contact = VALUES(guarantor1_contact),
        guarantor2_name = VALUES(guarantor2_name),
        guarantor2_contact = VALUES(guarantor2_contact),
        date_taken = VALUES(date_taken),
        due_date = VALUES(due_date),
        loan_taken = VALUES(loan_taken),
        principal_remaining = VALUES(principal_remaining),
        interest_remaining = VALUES(interest_remaining),
        total_remaining = VALUES(total_remaining),
        total_inarrears = VALUES(total_inarrears),
        number_of_days_in_arrears = VALUES(number_of_days_in_arrears),
        loan_status = VALUES(loan_status),
        user_id = VALUES(user_id);
    `;

    await connection.query(upsertQuery, [
      loan_id,
      customer_name,
      customer_contact,
      guarantor1_name,
      guarantor1_contact,
      guarantor2_name,
      guarantor2_contact,
      date_taken,
      due_date,
      loan_taken,
      principal_remaining,
      interest_remaining,
      total_remaining,
      total_inarrears,
      number_of_days_in_arrears,
      loan_status,
      company_name,
      branch_name,
      user_id
    ]);

    const [rows] = await connection.query(`
      SELECT * 
      FROM loan_portfolio 
      WHERE loan_id = ? 
        AND company_name = ?
        AND branch_name = ?
    `, [loan_id, company_name, branch_name]);

    await connection.commit();

    res.status(200).json({
      message: 'Loan portfolio data saved or updated successfully.',
      data: rows.length ? rows[0] : {}
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error saving or updating loan portfolio data:', error);
    res.status(500).json({
      message: 'Server error while saving or updating loan portfolio data.'
    });
  } finally {
    connection.release();
  }
});





// Keep the existing push-notification endpoint as-is
app.post('/push-notification', async (req, res) => {
  const { phone, data } = req.body;

  try {
    const insertQuery = 'INSERT INTO reports (phone, report_data, created_at) VALUES (?, ?, UTC_TIMESTAMP())';
    await connect.query(insertQuery, [phone, data]);

    if (subscribers[phone]) {
      subscribers[phone].emit('notification', {
        message: data,
        timestamp: new Date().toISOString()
      });
      res.send(`Notification sent to subscriber with phone ${phone}`);
    } else {
      res.send(`Subscriber with phone ${phone} is not connected. Notification will be delivered when they reconnect.`);
    }
  } catch (err) {
    console.error('Error handling push notification:', err);
    res.status(500).send('Server error');
  }
});


// app.get('/get-savings-transaction-per-id', async (req, res) => {
//   console.log("Received request at /get-transaction");

//   const { TrnId } = req.query;

//   const selectQuery = `SELECT * FROM transactions WHERE TrnId = ?`;

//   try {
//     // Retrieve the transaction data by TrnId
//     const [rows] = await connect.query(selectQuery, [TrnId]);

//     if (rows.length > 0) {
//       res.status(200).json({
//         message: 'Transaction data retrieved successfully.',
//         data: rows[0]
//       });
//     } else {
//       res.status(404).json({ message: 'Transaction not found.' });
//     }
//   } catch (error) {
//     console.error('Error retrieving transaction data:', error);
//     res.status(500).json({ message: 'Server error while retrieving transaction data.' });
//   }
// });



// app.get('/get-all-savings-transaction', async (req, res) => {
//   console.log("Received request at /get-transaction");

//   const { TrnId } = req.query;

//   const selectQuery = `SELECT * FROM transactions `;

//   try {
//     // Retrieve the transaction data by TrnId
//     const [rows] = await connect.query(selectQuery);

//     if (rows.length > 0) {
//       res.status(200).json({
//         message: 'Transaction data retrieved successfully.',
//         data: rows[0]
//       });
//     } else {
//       res.status(404).json({ message: 'Transaction not found.' });
//     }
//   } catch (error) {
//     console.error('Error retrieving transaction data:', error);
//     res.status(500).json({ message: 'Server error while retrieving transaction data.' });
//   }
// });



// Endpoint to retrieve all savings transactions filtered by branch and company

app.get('/get-all-savings-transaction', async (req, res) => {
  const { company_name, branch_name } = req.query;

  if (!company_name || !branch_name) {
    return res.status(400).json({ message: 'Company name and branch name are required.' });
  }

  const selectQuery = `
    SELECT TrnId, TrnDate, AccountNumber, AccountName, SavingsRunningBalance 
    FROM transactions
    WHERE company_name = ? AND branch_name = ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [company_name, branch_name]);

    if (rows.length > 0) {
      res.status(200).json({
        message: 'Transaction data retrieved successfully.',
        data: rows
      });
    } else {
      res.status(404).json({ message: 'No transactions found.' });
    }
  } catch (error) {
    console.error('Error retrieving transaction data:', error);
    res.status(500).json({ message: 'Server error while retrieving transaction data.' });
  }
});



app.get('/get-all-savings-transaction-search', async (req, res) => {
  const { company_name, branch_name } = req.query;

  if (!company_name || !branch_name) {
    return res.status(400).json({ message: 'Company name and branch name are required.' });
  }

  const searchTerm = req.query.term || '';
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  const selectQuery = `
    SELECT TrnId, TrnDate, AccountNumber, AccountName, SavingsRunningBalance 
    FROM transactions
    WHERE (AccountName LIKE ? OR AccountNumber LIKE ? OR TrnId LIKE ?)
      AND company_name = ? AND branch_name = ?
    LIMIT ? OFFSET ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [
      `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, company_name, branch_name, pageSize, offset
    ]);

    if (rows.length > 0) {
      res.status(200).json({
        message: 'Transaction data retrieved successfully.',
        data: rows,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalResults: rows.length
        }
      });
    } else {
      res.status(404).json({ message: 'No transactions found.' });
    }
  } catch (error) {
    console.error('Error retrieving transaction data:', error);
    res.status(500).json({ message: 'Server error while retrieving transaction data.' });
  }
});



app.get('/search-savings-transaction', async (req, res) => {
  const { company_name, branch_name } = req.query;
  console.log("Received request at /search-savings-transaction");
  if (!company_name || !branch_name) {
    return res.status(400).json({ message: 'Company name and branch name are required.' });
  }

  const searchTerm = req.query.term || '';

  const selectQuery = `
    SELECT TrnId, TrnDate, AccountNumber, AccountName, SavingsRunningBalance 
    FROM transactions
    WHERE (AccountName LIKE ? OR AccountNumber LIKE ? OR TrnId LIKE ?)
      AND company_name = ? AND branch_name = ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [
      `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, company_name, branch_name
    ]);

    res.status(200).json({
      message: 'Search completed successfully.',
      data: rows
    });

    io.emit('searchResults', rows);

  } catch (error) {
    console.error('Error retrieving search results:', error);
    res.status(500).json({ message: 'Server error while retrieving search results.' });
  }
});



app.post('/create-saving', authenticateJWT, async (req, res) => {
  // 1) Extract the fields from the body that you still need
  const { TrnId, amountSaved } = req.body;

  // 2) Extract the fields from the JWT-decoded data in `req.user`
  const { company_name, branch_name, local_user_id } = req.user;

  // 3) Validate input
  if (!TrnId || !amountSaved || amountSaved <= 0) {
    return res.status(400).json({ message: 'Invalid input parameters for savings creation.' });
  }

  let connection;
  try {
    connection = await connect.getConnection();
    await connection.beginTransaction();

    // 4) Fetch company details based on the company_name & branch_name from the token
    const companyDetailsQuery = `
      SELECT the_company_name, the_company_branch, the_company_box_number
      FROM the_company_datails
      WHERE company_name = ?
        AND branch_name  = ?
      LIMIT 1
    `;
    const [companyDetails] = await connection.query(companyDetailsQuery, [company_name, branch_name]);

    if (companyDetails.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Company details not found in the DB.' });
    }

    // 5) Update the savings balance in transactions
    const updateBalanceQuery = `
      UPDATE transactions
      SET SavingsRunningBalance = SavingsRunningBalance + ?
      WHERE TrnId = ?
    `;
    await connection.query(updateBalanceQuery, [amountSaved, TrnId]);

    // 6) Retrieve the updated balance
    const getUpdatedBalanceQuery = `
      SELECT SavingsRunningBalance, AccountNumber, AccountName
      FROM transactions
      WHERE TrnId = ?
      LIMIT 1
    `;
    const [rows] = await connection.query(getUpdatedBalanceQuery, [TrnId]);

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Transaction ID not found in transactions.' });
    }

    const updatedBalance = rows[0].SavingsRunningBalance;
    const accountNumber  = rows[0].AccountNumber;
    const accountName    = rows[0].AccountName;

    // 7) Insert a record into savings_history
    const insertHistoryQuery = `
      INSERT INTO savings_history (
        TrnId, TrnDate, AccountNumber, AccountName, 
        SavingsPaid, SavingsRunningBalance, 
        RECONCILED, company_name, branch_name, user_id, created_at
      )
      VALUES (?, NOW(), ?, ?, ?, ?, FALSE, ?, ?, ?, UTC_TIMESTAMP())
    `;
    await connection.query(insertHistoryQuery, [
      TrnId,
      accountNumber,
      accountName,
      amountSaved,
      updatedBalance,
      company_name,
      branch_name,
      local_user_id
    ]);

    // 8) Commit the transaction
    await connection.commit();

    // 9) Prepare receipt data
    const receiptData = {
      theCompanyName:        companyDetails[0].the_company_name,
      theCompanyBranch:      companyDetails[0].the_company_branch,
      theCompanyBoxNumber:   companyDetails[0].the_company_box_number,
      AccountName:           accountName,
      SavingsPaid:           amountSaved,
      SavingsRunningBalance: updatedBalance,
      Date:                  new Date().toISOString()
    };

    // 10) Return success
    res.status(200).json({
      message: 'Savings updated successfully.',
      receiptData: receiptData
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error updating savings:', error);
    res.status(500).json({ message: 'Server error while updating savings.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


// Endpoint to fetch all unreconciled savings records filtered by branch and company

app.get('/savings/unreconciled', async (req, res) => {
  const { company_name, branch_name } = req.query;

  if (!company_name || !branch_name) {
    return res.status(400).json({ message: 'Company name and branch name are required.' });
  }

  const connection = await connect.getConnection();

  try {
    const query = `
      SELECT * 
      FROM savings_history 
      WHERE Reconciled = 0 AND company_name = ? AND branch_name = ?
    `;
    const [unreconciledSavings] = await connection.query(query, [company_name, branch_name]);

    // Calculate totals for SavingsPaid
    const totalsRow = {
      id: 'Totals',
      TrnId: null,
      TrnDate: null,
      AccountNumber: null,
      AccountName: 'Total',
      SavingsPaid: unreconciledSavings.reduce((sum, row) => sum + parseFloat(row.SavingsPaid || 0), 0).toFixed(2),
      SavingsRunningBalance: null,
      RECONCILED: null,
      created_at: null,
    };

    // Append totals row
    unreconciledSavings.push(totalsRow);

    res.status(200).json(unreconciledSavings);
  } catch (error) {
    console.error('Error fetching unreconciled savings:', error);
    res.status(500).json({ message: 'Server error while fetching unreconciled savings.' });
  } finally {
    connection.release();
  }
});

// app.get('/get-all-savings-transaction', async (req, res) => {
//   console.log("Received request at /get-all-savings-transaction");

//   const selectQuery = `
//     SELECT TrnId, TrnDate, AccountNumber, AccountName, SavingsRunningBalance 
//     FROM transactions
//   `;

//   try {
//     // Retrieve the specified fields from all transaction data
//     const [rows] = await connect.query(selectQuery);

//     if (rows.length > 0) {
//       res.status(200).json({
//         message: 'Transaction data retrieved successfully.',
//         data: rows
//       });
//     } else {
//       res.status(404).json({ message: 'No transactions found.' });
//     }
//   } catch (error) {
//     console.error('Error retrieving transaction data:', error);
//     res.status(500).json({ message: 'Server error while retrieving transaction data.' });
//   }
// });



// app.get('/get-all-savings-transaction-search', async (req, res) => {
//   console.log("Received request at /get-all-savings-transaction");

//   const searchTerm = req.query.term || '';  // Search term for filtering results
//   const page = parseInt(req.query.page) || 1;  // Current page number, default is 1
//   const pageSize = parseInt(req.query.pageSize) || 10;  // Results per page, default is 10
//   const offset = (page - 1) * pageSize;  // Calculate the offset for pagination

//   const selectQuery = `
//     SELECT TrnId, TrnDate, AccountNumber, AccountName, SavingsRunningBalance 
//     FROM transactions
//     WHERE AccountName LIKE ? OR AccountNumber LIKE ? OR TrnId LIKE ?
//     LIMIT ? OFFSET ?
//   `;

//   try {
//     // Execute the query with pagination and search term filtering
//     const [rows] = await connect.query(selectQuery, [
//       `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, pageSize, offset
//     ]);

//     if (rows.length > 0) {
//       res.status(200).json({
//         message: 'Transaction data retrieved successfully.',
//         data: rows,
//         pagination: {
//           currentPage: page,
//           pageSize: pageSize,
//           totalResults: rows.length  // This will only reflect the current page's results count
//         }
//       });
//     } else {
//       res.status(404).json({ message: 'No transactions found.' });
//     }
//   } catch (error) {
//     console.error('Error retrieving transaction data:', error);
//     res.status(500).json({ message: 'Server error while retrieving transaction data.' });
//   }
// });



// app.get('/search-savings-transaction', async (req, res) => {
//   console.log("Received request at /search-savings-transaction");

//   const searchTerm = req.query.term || '';  // Get the search term from query

//   const selectQuery = `
//     SELECT TrnId, TrnDate, AccountNumber, AccountName, SavingsRunningBalance 
//     FROM transactions
//     WHERE AccountName LIKE ? OR AccountNumber LIKE ? OR TrnId LIKE ?
//   `;

//   try {
//     // Retrieve search results from the database
//     const [rows] = await connect.query(selectQuery, [
//       `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`
//     ]);

//     // Respond to the HTTP request with the search results
//     res.status(200).json({
//       message: 'Search completed successfully.',
//       data: rows
//     });

//     // Emit search results to all WebSocket clients
//     io.emit('searchResults', rows);

//   } catch (error) {
//     console.error('Error retrieving search results:', error);
//     res.status(500).json({ message: 'Server error while retrieving search results.' });
//   }
// });

// app.post('/create-saving', async (req, res) => {
//   const { TrnId, amountSaved } = req.body;

//   if (!TrnId || !amountSaved || amountSaved <= 0) {
//     return res.status(400).json({ message: 'Invalid TrnId or amount saved.' });
//   }

//   // Start a transaction
//   const connection = await connect.getConnection(); // Get a connection from the pool

//   try {
//     await connection.beginTransaction(); // Begin transaction

//     // Update SavingsRunningBalance in the transactions table
//     const updateBalanceQuery = `
//       UPDATE transactions
//       SET SavingsRunningBalance = SavingsRunningBalance + ?
//       WHERE TrnId = ?
//     `;
//     await connection.query(updateBalanceQuery, [amountSaved, TrnId]);

//     // Fetch the updated balance along with AccountNumber and AccountName
//     const getUpdatedBalanceQuery = `SELECT SavingsRunningBalance, AccountNumber, AccountName FROM transactions WHERE TrnId = ?`;
//     const [rows] = await connection.query(getUpdatedBalanceQuery, [TrnId]);

//     if (rows.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Transaction ID not found.' });
//     }

//     const updatedBalance = rows[0].SavingsRunningBalance;
//     const accountNumber = rows[0].AccountNumber;
//     const accountName = rows[0].AccountName;

//     // Insert into savings_history with the updated balance
//     const insertHistoryQuery = `
//       INSERT INTO savings_history (
//         TrnId, TrnDate, AccountNumber, AccountName, SavingsPaid, SavingsRunningBalance, RECONCILED, created_at
//       ) VALUES (?, NOW(), ?, ?, ?, ?, FALSE, UTC_TIMESTAMP())
//     `;
//     await connection.query(insertHistoryQuery, [
//       TrnId,
//       accountNumber,
//       accountName,
//       amountSaved,
//       updatedBalance // Use the updated balance
//     ]);

//     // Commit the transaction
//     await connection.commit();

//     res.status(200).json({ message: 'Savings updated successfully.' });
//   } catch (error) {
//     await connection.rollback(); // Rollback transaction on error
//     console.error('Error updating savings:', error);
//     res.status(500).json({ message: 'Server error while updating savings.' });
//   } finally {
//     connection.release(); // Release the connection back to the pool
//   }
// });

// app.post('/create-saving', async (req, res) => {
//   const { TrnId, amountSaved } = req.body;

//   if (!TrnId || !amountSaved || amountSaved <= 0) {
//     return res.status(400).json({ message: 'Invalid TrnId or amount saved.' });
//   }

//   // Start a transaction
//   const connection = await connect.getConnection();

//   try {
//     await connection.beginTransaction();

//     // Fetch company details
//     const companyDetailsQuery = `SELECT the_company_name, the_company_branch, the_company_box_number FROM the_company_datails WHERE the_company_details_id = 1`;
//     const [companyDetails] = await connection.query(companyDetailsQuery);

//     if (companyDetails.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Company details not found.' });
//     }

//     // Update SavingsRunningBalance in the transactions table
//     const updateBalanceQuery = `
//       UPDATE transactions
//       SET SavingsRunningBalance = SavingsRunningBalance + ?
//       WHERE TrnId = ?
//     `;
//     await connection.query(updateBalanceQuery, [amountSaved, TrnId]);

//     // Fetch the updated balance along with AccountNumber and AccountName
//     const getUpdatedBalanceQuery = `SELECT SavingsRunningBalance, AccountNumber, AccountName FROM transactions WHERE TrnId = ?`;
//     const [rows] = await connection.query(getUpdatedBalanceQuery, [TrnId]);

//     if (rows.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Transaction ID not found.' });
//     }

//     const updatedBalance = rows[0].SavingsRunningBalance;
//     const accountNumber = rows[0].AccountNumber;
//     const accountName = rows[0].AccountName;

//     // Insert into savings_history with the updated balance
//     const insertHistoryQuery = `
//       INSERT INTO savings_history (
//         TrnId, TrnDate, AccountNumber, AccountName, SavingsPaid, SavingsRunningBalance, RECONCILED, created_at
//       ) VALUES (?, NOW(), ?, ?, ?, ?, FALSE, UTC_TIMESTAMP())
//     `;
//     await connection.query(insertHistoryQuery, [
//       TrnId,
//       accountNumber,
//       accountName,
//       amountSaved,
//       updatedBalance
//     ]);

//     // Commit the transaction
//     await connection.commit();

//     // Prepare receipt data including company and transaction details
//     const receiptData = {
//       theCompanyName: companyDetails[0].the_company_name,
//       theCompanyBranch: companyDetails[0].the_company_branch,
//       theCompanyBoxNumber: companyDetails[0].the_company_box_number,
//       AccountName: accountName,
//       SavingsPaid: amountSaved,
//       SavingsRunningBalance: updatedBalance,
//       Date: new Date().toISOString()
//     };

//     // Send the receipt data via WebSocket
//     ws.send(JSON.stringify(receiptData), error => {
//       if (error) {
//         console.error('Failed to send message via WebSocket:', error);
//         return res.status(500).json({ message: 'Failed to send receipt via WebSocket.' });
//       }

//       res.status(200).json({ message: 'Savings updated and receipt sent successfully.' });
//     });
//   } catch (error) {
//     await connection.rollback();
//     console.error('Error updating savings:', error);
//     res.status(500).json({ message: 'Server error while updating savings.' });
//   } finally {
//     connection.release();
//   }
// });


// app.post('/create-saving', async (req, res) => {
//   const { TrnId, amountSaved } = req.body;

//   if (!TrnId || !amountSaved || amountSaved <= 0) {
//     return res.status(400).json({ message: 'Invalid TrnId or amount saved.' });
//   }

//   const connection = await connect.getConnection();

//   try {
//     await connection.beginTransaction();

//     // Fetch company details
//     const companyDetailsQuery = `SELECT the_company_name, the_company_branch, the_company_box_number FROM the_company_datails `;
//     const [companyDetails] = await connection.query(companyDetailsQuery);

//     if (companyDetails.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Company details not found.' });
//     }

//     const updateBalanceQuery = `
//       UPDATE transactions
//       SET SavingsRunningBalance = SavingsRunningBalance + ?
//       WHERE TrnId = ?
//     `;
//     await connection.query(updateBalanceQuery, [amountSaved, TrnId]);

//     const getUpdatedBalanceQuery = `SELECT SavingsRunningBalance, AccountNumber, AccountName FROM transactions WHERE TrnId = ?`;
//     const [rows] = await connection.query(getUpdatedBalanceQuery, [TrnId]);

//     if (rows.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Transaction ID not found.' });
//     }

//     const updatedBalance = rows[0].SavingsRunningBalance;
//     const accountNumber = rows[0].AccountNumber;
//     const accountName = rows[0].AccountName;

//     const insertHistoryQuery = `
//       INSERT INTO savings_history (
//         TrnId, TrnDate, AccountNumber, AccountName, SavingsPaid, SavingsRunningBalance, RECONCILED, created_at
//       ) VALUES (?, NOW(), ?, ?, ?, ?, FALSE, UTC_TIMESTAMP())
//     `;
//     await connection.query(insertHistoryQuery, [
//       TrnId, accountNumber, accountName, amountSaved, updatedBalance
//     ]);

//     await connection.commit();

//     // Prepare receipt data including company and transaction details
//     const receiptData = {
//       theCompanyName: companyDetails[0].the_company_name,
//       theCompanyBranch: companyDetails[0].the_company_branch,
//       theCompanyBoxNumber: companyDetails[0].the_company_box_number,
//       AccountName: accountName,
//       SavingsPaid: amountSaved,
//       SavingsRunningBalance: updatedBalance,
//       Date: new Date().toISOString()
//     };

//     // Broadcast the receipt data to all connected clients via WebSocket
//     io.emit('receiptData', receiptData);

//     res.status(200).json({ message: 'Savings updated and receipt sent successfully.' });
//   } catch (error) {
//     await connection.rollback();
//     console.error('Error updating savings:', error);
//     res.status(500).json({ message: 'Server error while updating savings.' });
//   } finally {
//     connection.release();
//   }
// });


// app.post('/create-saving', async (req, res) => {
//   const { TrnId, amountSaved } = req.body;

//   if (!TrnId || !amountSaved || amountSaved <= 0) {
//     return res.status(400).json({ message: 'Invalid TrnId or amount saved.' });
//   }

//   const connection = await connect.getConnection();

//   try {
//     await connection.beginTransaction();

//     // Fetch company details
//     const companyDetailsQuery = `SELECT the_company_name, the_company_branch, the_company_box_number FROM the_company_datails `;
//     const [companyDetails] = await connection.query(companyDetailsQuery);

//     if (companyDetails.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Company details not found.' });
//     }

//     const updateBalanceQuery = `
//       UPDATE transactions
//       SET SavingsRunningBalance = SavingsRunningBalance + ?
//       WHERE TrnId = ?
//     `;
//     await connection.query(updateBalanceQuery, [amountSaved, TrnId]);

//     const getUpdatedBalanceQuery = `SELECT SavingsRunningBalance, AccountNumber, AccountName FROM transactions WHERE TrnId = ?`;
//     const [rows] = await connection.query(getUpdatedBalanceQuery, [TrnId]);

//     if (rows.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Transaction ID not found.' });
//     }

//     const updatedBalance = rows[0].SavingsRunningBalance;
//     const accountNumber = rows[0].AccountNumber;
//     const accountName = rows[0].AccountName;

//     const insertHistoryQuery = `
//       INSERT INTO savings_history (
//         TrnId, TrnDate, AccountNumber, AccountName, SavingsPaid, SavingsRunningBalance, RECONCILED, created_at
//       ) VALUES (?, NOW(), ?, ?, ?, ?, FALSE, UTC_TIMESTAMP())
//     `;
//     await connection.query(insertHistoryQuery, [
//       TrnId, accountNumber, accountName, amountSaved, updatedBalance
//     ]);

//     await connection.commit();

//     // Prepare receipt data including company and transaction details
//     const receiptData = {
//       theCompanyName: companyDetails[0].the_company_name,
//       theCompanyBranch: companyDetails[0].the_company_branch,
//       theCompanyBoxNumber: companyDetails[0].the_company_box_number,
//       AccountName: accountName,
//       SavingsPaid: amountSaved,
//       SavingsRunningBalance: updatedBalance,
//       Date: new Date().toISOString()
//     };

//     // Return the receipt data as the response
//     res.status(200).json({
//       message: 'Savings updated successfully.',
//       receiptData: receiptData
//     });
//   } catch (error) {
//     await connection.rollback();
//     console.error('Error updating savings:', error);
//     res.status(500).json({ message: 'Server error while updating savings.' });
//   } finally {
//     connection.release();
//   }
// });

// app.get('/savings/unreconciled', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     const query = `SELECT * FROM savings_history WHERE Reconciled = 0`;
//     const [unreconciledSavings] = await connection.query(query);

//     res.status(200).json(unreconciledSavings);
//   } catch (error) {
//     console.error('Error fetching unreconciled savings:', error);
//     res.status(500).json({ message: 'Server error while fetching unreconciled savings.' });
//   } finally {
//     connection.release();
//   }
// });





// Endpoint to fetch ALL savings records for a given company + branch
app.get('/savings/all', async (req, res) => {
  const { company_name, branch_name } = req.query;

  // 1. Basic validation -----------------------------------------------------
  if (!company_name || !branch_name) {
    return res
      .status(400)
      .json({ message: 'Company name and branch name are required.' });
  }

  // 2. Grab a pooled connection --------------------------------------------
  const connection = await connect.getConnection();

  try {
    // 3. Filtered query ------------------------------------------------------
    const sql = `
      SELECT *
      FROM   savings_history
      WHERE  company_name = ?
        AND  branch_name  = ?`;
    const [savings] = await connection.query(sql, [company_name, branch_name]);

    /* 4. Optional – mirror the “totals” logic used in /savings/unreconciled
          Comment this whole block out if you DON’T want the extra row        */
    const totalsRow = {
      id: 'Totals',
      TrnId: null,
      TrnDate: null,
      AccountNumber: null,
      AccountName: 'Total',
      SavingsPaid: savings
        .reduce((sum, r) => sum + parseFloat(r.SavingsPaid || 0), 0)
        .toFixed(2),
      SavingsRunningBalance: null,
      RECONCILED: null,
      created_at: null,
    };
    savings.push(totalsRow);
    /* --------------------------------------------------------------------- */

    res.status(200).json(savings);
  } catch (err) {
    console.error('Error fetching savings records:', err);
    res
      .status(500)
      .json({ message: 'Server error while fetching savings records.' });
  } finally {
    // 5. Always release your connection -------------------------------------
    connection.release();
  }
});


// app.get('/savings/all', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     const query = `SELECT * FROM savings_history`;
//     const [allSavings] = await connection.query(query);

//     res.status(200).json(allSavings);
//   } catch (error) {
//     console.error('Error fetching all savings records:', error);
//     res.status(500).json({ message: 'Server error while fetching all savings records.' });
//   } finally {
//     connection.release();
//   }
// });

app.post('/savings/reconcile', async (req, res) => {
  const { id } = req.body;  // Expect an array of IDs to be reconciled

  if (!id || !Array.isArray(id) || id.length === 0) {
    return res.status(400).json({ message: 'Invalid or missing IDs.' });
  }

  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    const query = `UPDATE savings_history SET Reconciled = 1 WHERE id IN (?)`;
    await connection.query(query, [id]);

    await connection.commit();
    res.status(200).json({ message: 'Savings records marked as reconciled successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error reconciling savings records:', error);
    res.status(500).json({ message: 'Server error while reconciling savings records.' });
  } finally {
    connection.release();
  }
});



app.get('/get-all-loan-transactions', async (req, res) => {
  console.log("Received request at /get-all-loan-transactions");

  const { company_name, branch_name } = req.query;

  // Optional: make sure both are provided
  if (!company_name || !branch_name) {
    return res.status(400).json({
      message: "Please provide both 'company_name' and 'branch_name'."
    });
  }

  const selectQuery = `
    SELECT
      id,
      loan_id,
      customer_name,
      customer_contact,
      guarantor1_name,
      guarantor1_contact,
      guarantor2_name,
      guarantor2_contact,
      date_taken,
      due_date,
      loan_taken,
      principal_remaining,
      interest_remaining,
      total_remaining,
      total_inarrears,
      number_of_days_in_arrears,
      loan_status,
      company_name,
      branch_name,
      user_id
    FROM loan_portfolio
    WHERE company_name = ?
      AND branch_name = ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [company_name, branch_name]);

    if (rows.length > 0) {
      res.status(200).json({
        message: 'Loan data retrieved successfully.',
        data: rows
      });
    } else {
      res.status(404).json({
        message: 'No loans found for the specified company and branch.'
      });
    }
  } catch (error) {
    console.error('Error retrieving loan data:', error);
    res.status(500).json({
      message: 'Server error while retrieving loan data.'
    });
  }
});


app.get('/get-all-loan-transactions-search', async (req, res) => {
  console.log("Received request at /get-all-loan-transactions-search");

  // Read query parameters
  const searchTerm   = req.query.term         || '';
  const companyName  = req.query.company_name || '';
  const branchName   = req.query.branch_name  || '';
  const page         = parseInt(req.query.page) || 1;
  const pageSize     = parseInt(req.query.pageSize) || 10;
  const offset       = (page - 1) * pageSize;

  // Optional: Validate required fields
  if (!companyName || !branchName) {
    return res.status(400).json({
      message: "Please provide 'company_name' and 'branch_name'."
    });
  }

  // Adjust SELECT columns if you want more fields returned
  const selectQuery = `
    SELECT
      id,
      loan_id,
      customer_name,
      customer_contact,
      guarantor1_name,
      guarantor1_contact,
      guarantor2_name,
      guarantor2_contact,
      date_taken,
      due_date,
      loan_taken,
      principal_remaining,
      interest_remaining,
      total_remaining,
      total_inarrears,
      number_of_days_in_arrears,
      loan_status,
      company_name,
      branch_name,
      user_id
    FROM loan_portfolio
    WHERE (customer_name  LIKE ?
       OR  customer_contact LIKE ?
       OR  loan_id         LIKE ?)
      AND company_name = ?
      AND branch_name  = ?
    LIMIT ? OFFSET ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [
      `%${searchTerm}%`,  // for customer_name
      `%${searchTerm}%`,  // for customer_contact
      `%${searchTerm}%`,  // for loan_id
      companyName, 
      branchName,
      pageSize,
      offset
    ]);

    // You may want to calculate total count separately for full pagination
    // For now, the "totalResults" below just says how many are on this current page.
    res.status(200).json({
      message: 'Loan data retrieved successfully.',
      data: rows,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        resultsOnThisPage: rows.length
      }
    });
  } catch (error) {
    console.error('Error retrieving loan data:', error);
    res.status(500).json({ 
      message: 'Server error while retrieving loan data.' 
    });
  }
});


app.get('/search-loan-transaction', async (req, res) => {
  console.log("Received request at /search-loan-transaction");

  // Read query parameters
  const searchTerm   = req.query.term         || '';
  const companyName  = req.query.company_name || '';
  const branchName   = req.query.branch_name  || '';

  // Optional: Validate required fields
  if (!companyName || !branchName) {
    return res.status(400).json({
      message: "Please provide 'company_name' and 'branch_name'."
    });
  }

  const selectQuery = `
    SELECT
      id,
      loan_id,
      customer_name,
      customer_contact,
      guarantor1_name,
      guarantor1_contact,
      guarantor2_name,
      guarantor2_contact,
      date_taken,
      due_date,
      loan_taken,
      principal_remaining,
      interest_remaining,
      total_remaining,
      total_inarrears,
      number_of_days_in_arrears,
      loan_status,
      company_name,
      branch_name,
      user_id
    FROM loan_portfolio
    WHERE (customer_name  LIKE ?
       OR  customer_contact LIKE ?
       OR  loan_id         LIKE ?)
      AND company_name = ?
      AND branch_name  = ?
  `;

  try {
    const [rows] = await connect.query(selectQuery, [
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      `%${searchTerm}%`,
      companyName,
      branchName
    ]);

    // Return all matching rows
    res.status(200).json({
      message: 'Loan search completed successfully.',
      data: rows
    });

    // Emit via socket.io if desired
    io.emit('loanSearchResults', rows);
  } catch (error) {
    console.error('Error retrieving loan search results:', error);
    res.status(500).json({
      message: 'Server error while retrieving loan search results.'
    });
  }
});


/**
 * Middleware: authenticate and extract fields from JWT.
 * 
 * 1) Expects a header: "Authorization: Bearer <token>"
 * 2) Decodes the token with JWT_SECRET
 * 3) Attaches **all** decoded fields to req.user
 * 4) Calls next() if valid, or returns a 401/403 if not
 */
function authenticateJWT(req, res, next) {
  // 1) Grab the Authorization header
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'No Authorization header provided.' });
  }

  // 2) Parse out the Bearer token
  const [bearer, token] = authHeader.split(' ');
  if (bearer !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Invalid Authorization format. Expected Bearer token.' });
  }

  // 3) Verify the token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }

    // 4) Attach **all** decoded fields from the token to req.user.
    //    (Below is an example set — adjust to match whatever you include in the JWT.)
    req.user = {
      user_id: decoded.user_id,
      local_user_id: decoded.local_user_id,
      unique_user_code: decoded.unique_user_code,
      first_name: decoded.first_name,
      last_name: decoded.last_name,
      title: decoded.title,
      role: decoded.role,
      company_name: decoded.company_name,
      branch_name: decoded.branch_name,
      last_login: decoded.last_login,
      // If you REALLY included these in the JWT payload (not recommended):
      password_hash: decoded.password_hash,
      refresh_token: decoded.refresh_token,
      refresh_expires_at: decoded.refresh_expires_at,
      account_number: decoded.account_number,
      account_name: decoded.account_name,
      birth_date: decoded.birth_date,
      recruitement_date: decoded.recruitement_date,
      line_manager: decoded.line_manager,
      former_employment: decoded.former_employment,
      creation_time: decoded.creation_time,
      last_token_issued_at: decoded.last_token_issued_at,
      // ...any other fields you genuinely included in the token
    };

    // Proceed to the next middleware or route handler
    next();
  });
}

module.exports = {
  authenticateJWT
};





// At the top of your file, import the middleware
// const { authenticateJWT } = require('./jwtMiddleware');

// Then apply it to your route
app.post('/create-loan-payment', authenticateJWT, async (req, res) => {
  // 1) Now you only need to read from the body what’s NOT in the JWT:
  //    e.g. the `id` of the loan, the `amountPaid`, etc.
  const { id, amountPaid } = req.body;
console.log(req.body);
  // 2) Extract the company/branch/user from the JWT payload (set in the middleware)
  const { local_user_id, company_name, branch_name } = req.user;

  console.log("Received request at /create-loan-payment");
console.log(req.user);
  // Validate the required fields
  if (!id || !amountPaid || amountPaid <= 0) {
    return res.status(400).json({
      message: 'Please provide a valid loan "id" and "amountPaid" > 0.'
    });
  }

  let connection;
  try {
    // a) Get a connection and start a transaction
    connection = await connect.getConnection();
    await connection.beginTransaction();

    // b) Fetch company details by company_name and branch_name
    const companyDetailsQuery = `
      SELECT the_company_name,
             the_company_branch,
             the_company_box_number
      FROM the_company_datails
      WHERE the_company_name = ?
        AND the_company_branch = ?
      LIMIT 1
    `;
    const [companyDetails] = await connection.query(companyDetailsQuery, [
      company_name,
      branch_name
    ]);

    if (companyDetails.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: 'Company details not found for the specified name and branch.'
      });
    }

    // c) Fetch the loan record by ID, company, and branch
    const getLoanBalanceQuery = `
      SELECT id,
             loan_id,
             total_remaining,
             customer_name,
             customer_contact
      FROM loan_portfolio
      WHERE id = ?
        AND company_name = ?
        AND branch_name  = ?
      LIMIT 1
    `;
    const [loanRows] = await connection.query(getLoanBalanceQuery, [
      id,
      company_name,
      branch_name
    ]);

    if (loanRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: 'No matching loan record found for the given ID, company, and branch.'
      });
    }

    const currentBalance = parseFloat(loanRows[0].total_remaining) || 0;
    const updatedBalance = currentBalance - amountPaid;

    // d) Prevent paying more than the outstanding balance
    if (amountPaid > currentBalance) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Amount paid cannot exceed the outstanding balance.'
      });
    }

    const customerName    = loanRows[0].customer_name;
    const customerContact = loanRows[0].customer_contact;
    const loanId          = loanRows[0].loan_id; // For receipt or references

    // e) Update the remaining balance in loan_portfolio
    const updateLoanBalanceQuery = `
      UPDATE loan_portfolio
      SET total_remaining = ?
      WHERE id = ?
        AND company_name = ?
        AND branch_name = ?
    `;
    await connection.query(updateLoanBalanceQuery, [
      updatedBalance,
      id,
      company_name,
      branch_name
    ]);

    // f) Insert payment details into loan_paid
    const insertPaymentHistoryQuery = `
      INSERT INTO loan_paid (
        customer_number,
        customer_name,
        customer_contact,
        amount_paid,
        outstanding_total_amount,
        trxn_date,
        Reconciled,
        user_id,
        company_name,
        branch_name
      )
      VALUES (?, ?, ?, ?, ?, NOW(), 0, ?, ?, ?)
    `;
    await connection.query(insertPaymentHistoryQuery, [
      loanId || id,     // or whichever makes sense for 'customer_number'
      customerName,
      customerContact,
      amountPaid,
      updatedBalance,
      local_user_id,    // user_id from JWT
      company_name,
      branch_name
    ]);

    // g) Commit the transaction
    await connection.commit();

    // h) Prepare the receipt data
    const receiptData = {
      theCompanyName:      companyDetails[0].the_company_name,
      theCompanyBranch:    companyDetails[0].the_company_branch,
      theCompanyBoxNumber: companyDetails[0].the_company_box_number,
      loanId:              loanId || `ID: ${id}`,
      customerName:        customerName,
      amountPaid:          amountPaid,
      outstandingTotalAmount: updatedBalance,
      date:                new Date().toISOString()
    };

    // i) Return success + receiptData
    return res.status(200).json({
      message: 'Loan payment recorded successfully.',
      receiptData: receiptData
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error recording loan payment:', error);
    return res.status(500).json({
      message: 'Server error while recording loan payment.'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


app.get('/loans/unreconciled', async (req, res) => {
  let connection;
  try {
    // Read from query parameters
    const { company_name, branch_name } = req.query;

    // Validate
    if (!company_name || !branch_name) {
      return res.status(400).json({
        message: "Please provide 'company_name' and 'branch_name' as query parameters."
      });
    }

    connection = await connect.getConnection();

    // Query only loans for the specified company and branch
    const query = `
      SELECT *
      FROM loan_paid
      WHERE reconciled = 0
        AND company_name = ?
        AND branch_name = ?
    `;
    const [unreconciledLoans] = await connection.query(query, [
      company_name,
      branch_name
    ]);

    // Calculate the total of amount_paid
    const totalAmountPaid = unreconciledLoans.reduce(
      (sum, row) => sum + parseFloat(row.amount_paid || 0), 
      0
    );

    // Create a totals row and append it
    const totalsRow = {
      id: 'Totals',
      customer_number: null,
      customer_name: 'Total',
      customer_contact: null,
      amount_paid: totalAmountPaid.toFixed(2),
      outstanding_total_amount: null,
      trxn_date: null,
      reconciled: null,
      company_name: company_name,
      branch_name: branch_name,
      user_id: null
    };

    unreconciledLoans.push(totalsRow);

    res.status(200).json(unreconciledLoans);
  } catch (error) {
    console.error('Error fetching unreconciled loans:', error);
    res.status(500).json({
      message: 'Server error while fetching unreconciled loans.'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


// app.get('/savings/unreconciled', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     const query = `SELECT * FROM savings_history WHERE Reconciled = 0`;
//     const [unreconciledSavings] = await connection.query(query);

//     // Calculate totals for SavingsPaid
//     const totalsRow = {
//       id: 'Totals',
//       TrnId: null,
//       TrnDate: null,
//       AccountNumber: null,
//       AccountName: 'Total',
//       SavingsPaid: unreconciledSavings.reduce((sum, row) => sum + parseFloat(row.SavingsPaid || 0), 0).toFixed(2),
//       SavingsRunningBalance: null,
//       RECONCILED: null,
//       created_at: null,
//     };

//     // Append totals row
//     unreconciledSavings.push(totalsRow);

//     res.status(200).json(unreconciledSavings);
//   } catch (error) {
//     console.error('Error fetching unreconciled savings:', error);
//     res.status(500).json({ message: 'Server error while fetching unreconciled savings.' });
//   } finally {
//     connection.release();
//   }
// });

// app.get('/savings/all', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     const query = `SELECT * FROM savings_history`;
//     const [allSavings] = await connection.query(query);

//     // Calculate totals for SavingsPaid
//     const totalsRow = {
//       id: 'Totals',
//       TrnId: null,
//       TrnDate: null,
//       AccountNumber: null,
//       AccountName: 'Total',
//       SavingsPaid: allSavings.reduce((sum, row) => sum + parseFloat(row.SavingsPaid || 0), 0).toFixed(2),
//       SavingsRunningBalance: null,
//       RECONCILED: null,
//       created_at: null,
//     };

//     // Append totals row
//     allSavings.push(totalsRow);

//     res.status(200).json(allSavings);
//   } catch (error) {
//     console.error('Error fetching all savings records:', error);
//     res.status(500).json({ message: 'Server error while fetching all savings records.' });
//   } finally {
//     connection.release();
//   }
// });


// app.post('/savings/reconcile', async (req, res) => {
//   const { id } = req.body;  // Expect an array of IDs to be reconciled

//   if (!id || !Array.isArray(id) || id.length === 0) {
//     return res.status(400).json({ message: 'Invalid or missing IDs.' });
//   }

//   const connection = await connect.getConnection();

//   try {
//     await connection.beginTransaction();

//     const query = `UPDATE savings_history SET Reconciled = 1 WHERE id IN (?)`;
//     await connection.query(query, [id]);

//     await connection.commit();
//     res.status(200).json({ message: 'Savings records marked as reconciled successfully.' });
//   } catch (error) {
//     await connection.rollback();
//     console.error('Error reconciling savings records:', error);
//     res.status(500).json({ message: 'Server error while reconciling savings records.' });
//   } finally {
//     connection.release();
//   }
// });



// app.get('/get-all-loan-transactions', async (req, res) => {
//   console.log("Received request at /get-all-loan-transactions");

//   const selectQuery = `
//     SELECT loan_id, customer_name, customer_contact, loan_taken, principal_remaining, interest_remaining, total_remaining, total_inarrears, number_of_days_in_arrears, loan_status
//     FROM loan_portfolio
//   `;

//   try {
//     const [rows] = await connect.query(selectQuery);

//     if (rows.length > 0) {
//       res.status(200).json({
//         message: 'Loan data retrieved successfully.',
//         data: rows
//       });
//     } else {
//       res.status(404).json({ message: 'No loans found.' });
//     }
//   } catch (error) {
//     console.error('Error retrieving loan data:', error);
//     res.status(500).json({ message: 'Server error while retrieving loan data.' });
//   }
// });


// app.get('/get-all-loan-transactions-search', async (req, res) => {
//   console.log("Received request at /get-all-loan-transactions-search");

//   const searchTerm = req.query.term || '';
//   const page = parseInt(req.query.page) || 1;
//   const pageSize = parseInt(req.query.pageSize) || 10;
//   const offset = (page - 1) * pageSize;

//   const selectQuery = `
//     SELECT loan_id, customer_name, customer_contact, loan_taken, principal_remaining, interest_remaining, total_remaining, total_inarrears, number_of_days_in_arrears, loan_status
//     FROM loan_portfolio
//     WHERE customer_name LIKE ? OR customer_contact LIKE ? OR loan_id LIKE ?
//     LIMIT ? OFFSET ?
//   `;

//   try {
//     const [rows] = await connect.query(selectQuery, [
//       `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, pageSize, offset
//     ]);

//     if (rows.length > 0) {
//       res.status(200).json({
//         message: 'Loan data retrieved successfully.',
//         data: rows,
//         pagination: {
//           currentPage: page,
//           pageSize: pageSize,
//           totalResults: rows.length  // Reflects current page results count
//         }
//       });
//     } else {
//       res.status(404).json({ message: 'No loans found.' });
//     }
//   } catch (error) {
//     console.error('Error retrieving loan data:', error);
//     res.status(500).json({ message: 'Server error while retrieving loan data.' });
//   }
// });


// app.get('/search-loan-transaction', async (req, res) => {
//   console.log("Received request at /search-loan-transaction");

//   const searchTerm = req.query.term || '';

//   const selectQuery = `
//     SELECT loan_id, customer_name, customer_contact, loan_taken, principal_remaining, interest_remaining, total_remaining, total_inarrears, number_of_days_in_arrears, loan_status
//     FROM loan_portfolio
//     WHERE customer_name LIKE ? OR customer_contact LIKE ? OR loan_id LIKE ?
//   `;

//   try {
//     const [rows] = await connect.query(selectQuery, [
//       `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`
//     ]);

//     res.status(200).json({
//       message: 'Loan search completed successfully.',
//       data: rows
//     });

//     io.emit('loanSearchResults', rows);  // Emit loan search results via WebSocket
//   } catch (error) {
//     console.error('Error retrieving loan search results:', error);
//     res.status(500).json({ message: 'Server error while retrieving loan search results.' });
//   }
// });


// app.post('/create-loan-payment', async (req, res) => {
//   const { loan_id, amountPaid } = req.body;

//   if (!loan_id || !amountPaid || amountPaid <= 0) {
//     return res.status(400).json({ message: 'Invalid loan ID or amount paid.' });
//   }

//   const connection = await connect.getConnection();

//   try {
//     await connection.beginTransaction();

//     // Fetch company details (if applicable)
//     const companyDetailsQuery = `SELECT the_company_name, the_company_branch, the_company_box_number FROM the_company_datails`;
//     const [companyDetails] = await connection.query(companyDetailsQuery);

//     if (companyDetails.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Company details not found.' });
//     }

//     // Fetch the current loan balance and check if the loan exists
//     const getLoanBalanceQuery = `SELECT total_remaining, customer_name, customer_contact FROM loan_portfolio WHERE loan_id = ?`;
//     const [loanRows] = await connection.query(getLoanBalanceQuery, [loan_id]);

//     if (loanRows.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ message: 'Loan ID not found.' });
//     }

//     const updatedBalance = loanRows[0].total_remaining - amountPaid;
//     const customerName = loanRows[0].customer_name;
//     const customerContact = loanRows[0].customer_contact;

//     // Update the remaining balance in the loan portfolio
//     const updateLoanBalanceQuery = `
//       UPDATE loan_portfolio
//       SET total_remaining = ?
//       WHERE loan_id = ?
//     `;
//     await connection.query(updateLoanBalanceQuery, [updatedBalance, loan_id]);

//     // Insert payment details into the loan_paid table
//     const insertPaymentHistoryQuery = `
//       INSERT INTO loan_paid (
//         customer_number, customer_name, customer_contact, amount_paid, outstanding_total_amount, trxn_date, Reconciled
//       ) VALUES (?, ?, ?, ?, ?, NOW(), 0)
//     `;
//     await connection.query(insertPaymentHistoryQuery, [
//       loan_id, customerName, customerContact, amountPaid, updatedBalance
//     ]);

//     await connection.commit();

//     // Prepare receipt data including company and loan details
//     const receiptData = {
//       theCompanyName: companyDetails[0].the_company_name,
//       theCompanyBranch: companyDetails[0].the_company_branch,
//       theCompanyBoxNumber: companyDetails[0].the_company_box_number,
//       customerName: customerName,
//       amountPaid: amountPaid,
//       outstandingTotalAmount: updatedBalance,
//       Date: new Date().toISOString()
//     };

//     // Return the receipt data as the response
//     res.status(200).json({
//       message: 'Loan payment recorded successfully.',
//       receiptData: receiptData
//     });
//   } catch (error) {
//     await connection.rollback();
//     console.error('Error recording loan payment:', error);
//     res.status(500).json({ message: 'Server error while recording loan payment.' });
//   } finally {
//     connection.release();
//   }
// });

// app.get('/loans/unreconciled', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     const query = `SELECT * FROM loan_paid WHERE reconciled = 0`;
//     const [unreconciledLoans] = await connection.query(query);

//     // Calculate totals for amount_paid
//     const totalsRow = {
//       id: 'Totals',
//       customer_number: null,
//       customer_name: 'Total',
//       customer_contact: null,
//       amount_paid: unreconciledLoans.reduce((sum, row) => sum + parseFloat(row.amount_paid || 0), 0).toFixed(2),
//       outstanding_total_amount: null,
//       trxn_date: null,
//       reconciled: null,
//     };

//     // Append totals row
//     unreconciledLoans.push(totalsRow);

//     res.status(200).json(unreconciledLoans);
//   } catch (error) {
//     console.error('Error fetching unreconciled loans:', error);
//     res.status(500).json({ message: 'Server error while fetching unreconciled loans.' });
//   } finally {
//     connection.release();
//   }
// });

// app.get('/loans/all', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     const query = `SELECT * FROM loan_paid`;
//     const [allLoans] = await connection.query(query);

//     // Calculate totals for amount_paid
//     const totalsRow = {
//       id: 'Totals',
//       customer_number: null,
//       customer_name: 'Total',
//       customer_contact: null,
//       amount_paid: allLoans.reduce((sum, row) => sum + parseFloat(row.amount_paid || 0), 0).toFixed(2),
//       outstanding_total_amount: null,
//       trxn_date: null,
//       reconciled: null,
//     };

//     // Append totals row
//     allLoans.push(totalsRow);

//     res.status(200).json(allLoans);
//   } catch (error) {
//     console.error('Error fetching all loan records:', error);
//     res.status(500).json({ message: 'Server error while fetching all loan records.' });
//   } finally {
//     connection.release();
//   }
// });




// Endpoint to fetch all loan payments for a specific company + branch
app.get('/loans/all', async (req, res) => {
  const { company_name, branch_name } = req.query;

  /* 1️⃣  Guard-clause: both filters are mandatory */
  if (!company_name || !branch_name) {
    return res
      .status(400)
      .json({ message: 'Company name and branch name are required.' });
  }

  const connection = await connect.getConnection();

  try {
    /* 2️⃣  Parameterised query – prevents SQL-injection */
    const sql = `
      SELECT *
      FROM   loan_paid
      WHERE  company_name = ? AND branch_name = ?
      ORDER  BY trxn_date DESC, id DESC
    `;

    const [loans] = await connection.query(sql, [company_name, branch_name]);

    /* 3️⃣  Optional summary row (totals) */
    const summaryRow = {
      id:                     'Totals',
      customer_number:        null,
      customer_name:          'Total',
      customer_contact:       null,
      amount_paid:            loans
                                .reduce((s, r) => s + parseFloat(r.amount_paid || 0), 0)
                                .toFixed(2),
      outstanding_total_amount: null,
      trxn_date:              null,
      reconciled:             null,
    };
    loans.push(summaryRow);

    res.status(200).json(loans);
  } catch (err) {
    console.error('Error fetching loan records:', err);
    res
      .status(500)
      .json({ message: 'Server error while fetching loan records.' });
  } finally {
    connection.release();
  }
});


// app.get('/loans/unreconciled', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     const query = `SELECT * FROM loan_paid WHERE Reconciled = 0`;
//     const [unreconciledLoans] = await connection.query(query);

//     res.status(200).json(unreconciledLoans);
//   } catch (error) {
//     console.error('Error fetching unreconciled loans:', error);
//     res.status(500).json({ message: 'Server error while fetching unreconciled loans.' });
//   } finally {
//     connection.release();
//   }
// });


// app.get('/loans/all', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     const query = `SELECT * FROM loan_paid`;
//     const [allLoans] = await connection.query(query);

//     res.status(200).json(allLoans);
//   } catch (error) {
//     console.error('Error fetching all loan records:', error);
//     res.status(500).json({ message: 'Server error while fetching all loan records.' });
//   } finally {
//     connection.release();
//   }
// });


// app.post('/loans/reconcile', async (req, res) => {
//   const { id } = req.body;  // Expect an array of loan payment IDs to reconcile

//   if (!id || !Array.isArray(id) || id.length === 0) {
//     return res.status(400).json({ message: 'Invalid or missing IDs.' });
//   }

//   const connection = await connect.getConnection();

//   try {
//     await connection.beginTransaction();

//     const query = `UPDATE loan_paid SET Reconciled = 1 WHERE id IN (?)`;
//     await connection.query(query, [id]);

//     await connection.commit();
//     res.status(200).json({ message: 'Loan payments marked as reconciled successfully.' });
//   } catch (error) {
//     await connection.rollback();
//     console.error('Error reconciling loan payments:', error);
//     res.status(500).json({ message: 'Server error while reconciling loan payments.' });
//   } finally {
//     connection.release();
//   }
// });


app.post('/loans/reconcile', async (req, res) => {
  const { id } = req.body;  // Expect an array of loan payment IDs to reconcile

  if (!id || !Array.isArray(id) || id.length === 0) {
    return res.status(400).json({ message: 'Invalid or missing IDs.' });
  }

  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    const query = `UPDATE loan_paid SET Reconciled = 1 WHERE id IN (?)`;
    await connection.query(query, [id]);

    await connection.commit();
    res.status(200).json({ message: 'Loan payments marked as reconciled successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error reconciling loan payments:', error);
    res.status(500).json({ message: 'Server error while reconciling loan payments.' });
  } finally {
    connection.release();
  }
});



// Example top imports (adjust paths as needed):
// const connect = require('./db');    // or wherever your connect.getConnection() is exported
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcrypt');
// const { JWT_SECRET } = require('./config'); // or however you store the secret

// Make sure you have the same imports / configuration as your '/login' route.
// e.g.:
// const connect = require('./db');         // or wherever you export connect.getConnection()
// const jwt = require('jsonwebtoken');
// const { JWT_SECRET } = require('./config'); // or however you store your secret

app.post('/save-company', async (req, res) => {
  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    const {
      the_company_name,
      the_company_branch,
      the_company_box_number,
      company_name,
      branch_name,
      user_id
    } = req.body;

    /* ---------- 1. validation ---------- */
    if (!company_name || !branch_name || !user_id) {
      await connection.rollback();
      return res.status(400).json({
        message: 'company_name, branch_name, and user_id are required.'
      });
    }

    /* ---------- 2. does a row already exist? ---------- */
    const [rows] = await connection.query(
      `SELECT the_company_details_id
         FROM the_company_datails
        WHERE company_name = ?
          AND branch_name  = ?
          AND user_id      = ?
        LIMIT 1`,
      [company_name, branch_name, user_id]
    );

    let companyRecord;
    if (rows.length) {
      /* ---------- 2a. UPDATE path ---------- */
      const id = rows[0].the_company_details_id;

      await connection.query(
        `UPDATE the_company_datails
            SET the_company_name       = ?,
                the_company_branch     = ?,
                the_company_box_number = ?,
                update_at              = CURRENT_TIMESTAMP
          WHERE the_company_details_id = ?`,
        [
          the_company_name       || 'Edad Coin SMS-Ltd',
          the_company_branch     || 'Edad Coin SMS-Ltd',
          the_company_box_number || 'Edad Coin SMS-Ltd',
          id
        ]
      );

      /* grab the fresh row */
      const [updated] = await connection.query(
        `SELECT * FROM the_company_datails
          WHERE the_company_details_id = ?`,
        [id]
      );
      companyRecord = updated[0];
    } else {
      /* ---------- 2b. INSERT path ---------- */
      const [result] = await connection.query(
        `INSERT INTO the_company_datails (
           the_company_name,
           the_company_branch,
           the_company_box_number,
           created_at,
           update_at,
           company_name,
           branch_name,
           user_id
         )
         VALUES ( ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ? )`,
        [
          the_company_name       || 'Edad Coin SMS-Ltd',
          the_company_branch     || 'Edad Coin SMS-Ltd',
          the_company_box_number || 'Edad Coin SMS-Ltd',
          company_name,
          branch_name,
          user_id
        ]
      );

      const [inserted] = await connection.query(
        `SELECT * FROM the_company_datails
          WHERE the_company_details_id = ?`,
        [result.insertId]
      );
      companyRecord = inserted[0];
    }

    await connection.commit();

    res.status(200).json({
      message: rows.length
        ? 'Company record updated successfully.'
        : 'New company record inserted successfully.',
      data: companyRecord
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error saving company record:', error);
    res.status(500).json({ message: 'Server error while saving company record.' });
  } finally {
    connection.release();
  }
});

// app.post('/save-company', async (req, res) => {
//   // Acquire a connection from your pool
//   const connection = await connect.getConnection();

//   try {
//     await connection.beginTransaction();

//     console.log("Received request at /save-company");
//     console.log(req.body);

//     // 1. Destructure the request body
//     const {
//       the_company_name,
//       the_company_branch,
//       the_company_box_number,
//       company_name,
//       branch_name,
//       user_id
//     } = req.body;

//     // 2. Validate the required fields
//     if (!company_name || !branch_name || !user_id) {
//       await connection.rollback();
//       return res.status(400).json({
//         message: 'company_name, branch_name, and user_id are required.'
//       });
//     }

//     // 3. Check if record already exists
//     const checkQuery = `
//       SELECT *
//       FROM the_company_datails
//       WHERE company_name = ?
//         AND branch_name = ?
//         AND user_id = ?
//       LIMIT 1
//     `;
//     const [existingRows] = await connection.query(checkQuery, [
//       company_name,
//       branch_name,
//       user_id
//     ]);

//     let companyRecord;
//     if (existingRows.length > 0) {
//       // Record already exists
//       companyRecord = existingRows[0];
//     } else {
//       // 4. Insert a new record
//       const insertQuery = `
//         INSERT INTO the_company_datails (
//           the_company_name,
//           the_company_branch,
//           the_company_box_number,
//           created_at,
//           update_at,
//           company_name,
//           branch_name,
//           user_id
//         )
//         VALUES (
//           ?, ?, ?, 
//           CURRENT_TIMESTAMP, 
//           CURRENT_TIMESTAMP, 
//           ?, ?, ?
//         )
//       `;
//       const [result] = await connection.query(insertQuery, [
//         the_company_name  || 'Edad Coin SMS-Ltd',
//         the_company_branch || 'Edad Coin SMS-Ltd',
//         the_company_box_number || 'Edad Coin SMS-Ltd',
//         company_name,
//         branch_name,
//         user_id
//       ]);

//       // 5. Retrieve the newly inserted row
//       const [newRows] = await connection.query(
//         `SELECT * FROM the_company_datails 
//          WHERE the_company_details_id = ?`,
//         [result.insertId]
//       );
//       companyRecord = newRows[0];
//     }

//     // 6. Commit the transaction
//     await connection.commit();

//     // 7. Return the record (existing or newly inserted)
//     res.status(200).json({
//       message: existingRows.length > 0
//         ? 'Company record already exists. Returning existing record.'
//         : 'New company record inserted successfully.',
//       data: companyRecord
//     });
//   } catch (error) {
//     // Roll back on error
//     await connection.rollback();
//     console.error('Error saving company record:', error);
//     res.status(500).json({
//       message: 'Server error while saving company record.'
//     });
//   } finally {
//     // Release the connection back to the pool
//     connection.release();
//   }
// });



/**
 * Example of how you might import/require your DB connection module:
 */
// const connect = require('./db'); // <-- Adjust path as needed

/**
 * Helper: Generate a random numeric code of the specified length (digits only).
 */
function generateRandomCode(length = 4) {
  let code = '';
  for (let i = 0; i < length; i++) {
    // Math.random() * 10 gives a random number 0–9.99..., floor it to get an integer 0–9
    code += Math.floor(Math.random() * 10);
  }
  return code;
}


/**
 * Helper: Generate a truly unique code by checking the DB for collisions.
 * - connection: an active DB connection
 * - length: length of the random code to generate (defaults to 8)
 */
async function generateUniqueCodeInDB(connection, length = 4) {
  let code;
  let isUnique = false;

  while (!isUnique) {
    code = generateRandomCode(length);

    // Check if this code is already in log_in
    const [rows] = await connection.query(
      'SELECT user_id FROM log_in WHERE unique_user_code = ? LIMIT 1',
      [code]
    );

    if (rows.length === 0) {
      // If no record has this code, it's unique in the DB
      isUnique = true;
    }
  }

  return code;
}


// // Authentication route
// app.post('/login', async (req, res) => {
//   const { user_id, p_word_login } = req.body;

//   // Validate input
//   if (!user_id || !p_word_login) {
//     return res.status(400).json({ message: 'User ID and password are required.' });
//   }

//   const connection = await connect.getConnection();

//   try {
//     // Fetch user details from the log_in table
//     const query = `SELECT user_id, p_word_login, account_name, role FROM log_in WHERE user_id = ?`;
//     const [userRows] = await connection.query(query, [user_id]);

//     // Check if user exists
//     if (userRows.length === 0) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     const user = userRows[0];

//     // Verify password (use bcrypt.compare if passwords are hashed)
//     if (user.p_word_login !== p_word_login) {
//       return res.status(401).json({ message: 'Invalid credentials.' });
//     }

//     // Generate JWT token (set expiration as needed, e.g., '1h' for 1 hour)
//     const token = jwt.sign(
//       { user_id: user.user_id, account_name: user.account_name, role: user.role },
//       JWT_SECRET,
//       { expiresIn: '1h' }
//     );

//     // Send response with token
//     res.status(200).json({
//       message: 'Login successful',
//       token,
//       user: {
//         user_id: user.user_id,
//         account_name: user.account_name,
//         role: user.role
//       }
//     });
//   } catch (error) {
//     console.error('Error during authentication:', error);
//     res.status(500).json({ message: 'Server error during authentication.' });
//   } finally {
//     connection.release();
//   }
// });

// app.post('/save-login', async (req, res) => {
//   const connection = await connect.getConnection();
// console.log('Received request at /save-login');
//   try {
//     await connection.beginTransaction();

//     /* 1. Destructure request body */
//     const {
//       username,
//       password_hash,
//       company_name,
//       branch_name,
//       local_user_id,
//       title,
//       first_name,
//       last_name,
//       birth_date,
//       recruitement_date,
//       line_manager,
//       former_employment,
//       role,
//       creation_time,
//       unique_user_code     // may be undefined / blank
//     } = req.body;

//     /* 2. Check if the row already exists */
//     const [found] = await connection.query(
//       `SELECT unique_user_code
//          FROM log_in
//         WHERE company_name  = ?
//           AND branch_name   = ?
//           AND local_user_id = ?
//         LIMIT 1`,
//       [company_name, branch_name, local_user_id]
//     );

//     let finalUniqueCode;          // value we will commit
//     let action;                   // “inserted” | “updated”

//     if (found.length === 0) {
//       /* ---------- INSERT branch ---------- */
//       finalUniqueCode =
//         unique_user_code || (await generateUniqueCodeInDB(connection, 8));

//       await connection.query(
//         `INSERT INTO log_in (
//            username, password_hash, company_name, branch_name, local_user_id,
//            title, first_name, last_name, birth_date, recruitement_date,
//            line_manager, former_employment, role, creation_time,
//            unique_user_code
//          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
//         [
//           username,
//           password_hash || null,
//           company_name,
//           branch_name,
//           local_user_id,
//           title || null,
//           first_name || null,
//           last_name || null,
//           birth_date || null,
//           recruitement_date || null,
//           line_manager || null,
//           former_employment || null,
//           role || null,
//           creation_time || null,
//           finalUniqueCode
//         ]
//       );

//       action = 'inserted';
//     } else {
//       /* ---------- UPDATE branch ---------- */
//       finalUniqueCode = found[0].unique_user_code;   // keep existing

//       await connection.query(
//         `UPDATE log_in SET
//            username          = ?,                -- in case it changed
//            password_hash     = ?, 
//            title             = ?,
//            first_name        = ?,
//            last_name         = ?,
//            birth_date        = ?,
//            recruitement_date = ?,
//            line_manager      = ?,
//            former_employment = ?,
//            role              = ?,
//            creation_time     = ?
//          WHERE company_name  = ?
//            AND branch_name   = ?
//            AND local_user_id = ?`,
//         [
//           username,
//           password_hash || null,
//           title || null,
//           first_name || null,
//           last_name || null,
//           birth_date || null,
//           recruitement_date || null,
//           line_manager || null,
//           former_employment || null,
//           role || null,
//           creation_time || null,
//           company_name,
//           branch_name,
//           local_user_id
//         ]
//       );

//       action = 'updated';
//     }

//     /* 3. Fetch the fresh row */
//     const [rowData] = await connection.query(
//       `SELECT * FROM log_in
//         WHERE company_name  = ?
//           AND branch_name   = ?
//           AND local_user_id = ?
//         LIMIT 1`,
//       [company_name, branch_name, local_user_id]
//     );

//     await connection.commit();

//     res.status(200).json({
//       message: `User ${action} successfully.`,
//       data: rowData[0] || {},
//       unique_user_code: finalUniqueCode
//     });
//   } catch (err) {
//     await connection.rollback();
//     console.error('save-login error:', err);
//     res.status(500).json({ message: 'Server error while saving user record.' });
//   } finally {
//     connection.release();
//   }
// });


// make sure you have this unique constraint in your schema:
// ALTER TABLE log_in
//   ADD UNIQUE KEY uq_comp_branch_user (company_name, branch_name, local_user_id);

// app.post('/save-login', async (req, res) => {
//   const connection = await connect.getConnection();
//   console.log('Received request at /save-login');
//   console.log(req.body); // Log the request body for debugging
//   try {
//     await connection.beginTransaction();

//     /* 1. Destructure request body */
//     const {
//       username,
//       password_hash,
//       company_name,
//       branch_name,
//       local_user_id,
//       title,
//       first_name,
//       last_name,
//       birth_date,
//       recruitement_date,
//       line_manager,
//       former_employment,
//       role,
//       creation_time,
//       unique_user_code    // optional: if you want to override existing
//     } = req.body;

//     /* 2. Validate required keys */
//     if (!company_name || !branch_name || !local_user_id || !username) {
//       await connection.rollback();
//       return res.status(400).json({
//         message: 'company_name, branch_name, local_user_id and username are required.'
//       });
//     }

//     /* 3. Build the upsert */
//     const upsertSql = `
//       INSERT INTO log_in (
//         username,
//         password_hash,
//         company_name,
//         branch_name,
//         local_user_id,
//         title,
//         first_name,
//         last_name,
//         birth_date,
//         recruitement_date,
//         line_manager,
//         former_employment,
//         role,
//         creation_time,
//         unique_user_code
//       ) VALUES (
//         ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
//       )
//       ON DUPLICATE KEY UPDATE
//         username          = VALUES(username),
//         password_hash     = VALUES(password_hash),
//         title             = VALUES(title),
//         first_name        = VALUES(first_name),
//         last_name         = VALUES(last_name),
//         birth_date        = VALUES(birth_date),
//         recruitement_date = VALUES(recruitement_date),
//         line_manager      = VALUES(line_manager),
//         former_employment = VALUES(former_employment),
//         role              = VALUES(role),
//         creation_time     = VALUES(creation_time),
//         unique_user_code  = 
//           IF(VALUES(unique_user_code) IS NOT NULL, 
//              VALUES(unique_user_code), 
//              unique_user_code
//           )
//     `;

//     // 4. Execute the upsert
//     await connection.query(upsertSql, [
//       username,
//       password_hash || null,
//       company_name,
//       branch_name,
//       local_user_id,
//       title || null,
//       first_name || null,
//       last_name || null,
//       birth_date || null,
//       recruitement_date || null,
//       line_manager || null,
//       former_employment || null,
//       role || null,
//       creation_time || null,
//       unique_user_code || null
//     ]);

//     /* 5. Fetch the fresh row */
//     const [rows] = await connection.query(
//       `SELECT * FROM log_in
//          WHERE company_name  = ?
//            AND branch_name   = ?
//            AND local_user_id = ?
//          LIMIT 1`,
//       [company_name, branch_name, local_user_id]
//     );

//     await connection.commit();

//     res.status(200).json({
//       message: rows.length
//         ? 'User record inserted/updated successfully.'
//         : 'User record upsert did not return a row.',
//       data: rows[0] || {}
//     });
//   } catch (err) {
//     await connection.rollback();
//     console.error('save-login error:', err);
//     res.status(500).json({ message: 'Server error while saving user record.' });
//   } finally {
//     connection.release();
//   }
// });

// Ensure you have this unique constraint on log_in:
// ALTER TABLE log_in
//   ADD UNIQUE KEY uq_comp_branch_user (company_name, branch_name, local_user_id);

app.post('/save-login', async (req, res) => {
  const connection = await connect.getConnection();
  console.log('Received request at /save-login:', req.body);

  try {
    await connection.beginTransaction();

    // 1. Destructure & validate
    const {
      username,
      password_hash,
      company_name,
      branch_name,
      local_user_id,
      title,
      first_name,
      last_name,
      birth_date,
      recruitement_date,
      line_manager,
      former_employment,
      role,
      unique_user_code   // optional override if you want to set it explicitly
    } = req.body;

    if (!username || !company_name || !branch_name || !local_user_id) {
      await connection.rollback();
      return res.status(400).json({
        message: 'username, company_name, branch_name and local_user_id are required.'
      });
    }

    // 2. Upsert in one statement
    const upsertSql = `
      INSERT INTO log_in (
        username,
        password_hash,
        company_name,
        branch_name,
        local_user_id,
        title,
        first_name,
        last_name,
        birth_date,
        recruitement_date,
        line_manager,
        former_employment,
        role,
        unique_user_code
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        username          = VALUES(username),
        password_hash     = VALUES(password_hash),
        title             = VALUES(title),
        first_name        = VALUES(first_name),
        last_name         = VALUES(last_name),
        birth_date        = VALUES(birth_date),
        recruitement_date = VALUES(recruitement_date),
        line_manager      = VALUES(line_manager),
        former_employment = VALUES(former_employment),
        role              = VALUES(role),
        /* only override if provided, else keep existing: */
        unique_user_code  = IF(
                              VALUES(unique_user_code) IS NOT NULL,
                              VALUES(unique_user_code),
                              unique_user_code
                            )
    `;

    await connection.query(upsertSql, [
      username,
      password_hash || null,
      company_name,
      branch_name,
      local_user_id,
      title            || null,
      first_name       || null,
      last_name        || null,
      birth_date       || null,
      recruitement_date|| null,
      line_manager     || null,
      former_employment|| null,
      role             || null,
      unique_user_code || null
    ]);

    // 3. Retrieve the freshly inserted/updated row
    const [rows] = await connection.query(
      `SELECT * 
         FROM log_in
        WHERE company_name  = ?
          AND branch_name   = ?
          AND local_user_id = ?
        LIMIT 1`,
      [company_name, branch_name, local_user_id]
    );

    await connection.commit();

    // 4. Respond with the full record
    return res.status(200).json({
      message: 'User record inserted/updated successfully.',
      data:    rows[0] || {}
    });

  } catch (err) {
    await connection.rollback();
    console.error('save-login error:', err);
    return res.status(500).json({
      message: 'Server error while saving user record.'
    });
  } finally {
    connection.release();
  }
});


app.post('/login', async (req, res) => {
  const { local_user_id, password, unique_user_code } = req.body;

  // 1) Validate input
  if (!local_user_id || !password || !unique_user_code) {
    return res.status(400).json({
      message: 'local_user_id, password, and unique_user_code are required.'
    });
  }

  // Acquire connection
  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    // 2) Query the user by local_user_id + unique_user_code
    const selectQuery = `
      SELECT *
      FROM log_in
      WHERE local_user_id = ?
        AND unique_user_code = ?
      LIMIT 1
    `;
    const [rows] = await connection.query(selectQuery, [local_user_id, unique_user_code]);

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'User not found or invalid unique code.' });
    }
    const user = rows[0];

    // 3) Plaintext password check (not secure for production)
    if (user.password_hash !== password) {
      await connection.rollback();
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // 4) Update last_login
    const updateQuery = `
      UPDATE log_in
      SET last_login = NOW()
      WHERE local_user_id = ?
        AND unique_user_code = ?
    `;
    await connection.query(updateQuery, [local_user_id, unique_user_code]);

    // 5) Generate JWT, including title, role, company_name, etc.
    const token = jwt.sign(
      {
        local_user_id: user.local_user_id,
        title: user.title,                // <-- Include title here
        role: user.role,
        company_name: user.company_name,  
        branch_name: user.branch_name     
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await connection.commit();

    // 6) Return response
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        local_user_id: user.local_user_id,
        unique_user_code: user.unique_user_code,
        first_name: user.first_name,
        last_name: user.last_name,
        title: user.title,
        role: user.role,
        company_name: user.company_name,
        branch_name: user.branch_name,
        last_login: user.last_login
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Server error during login.' });
  } finally {
    connection.release();
  }
});



/**
 * GET /users
 * ----------
 * Retrieve user records from log_in.
 *
 * Optional query‑string filters:
 *   • user_id
 *   • username
 *   • local_user_id
 *   • unique_user_code
 *   • company_name
 *   • branch_name
 *   • role
 *
 * If no filters are supplied the route returns every row
 * (you can forbid that by checking `if (!hasFilters) …`).
 */



app.get('/users', async (req, res) => {
  const {
    user_id,
    username,
    local_user_id,
    unique_user_code,
    company_name,
    branch_name,
    role
  } = req.query;

  // Build WHERE clause dynamically
  const conditions = [];
  const params     = [];

  if (user_id)           { conditions.push('user_id         = ?'); params.push(user_id); }
  if (username)          { conditions.push('username        = ?'); params.push(username); }
  if (local_user_id)     { conditions.push('local_user_id   = ?'); params.push(local_user_id); }
  if (unique_user_code)  { conditions.push('unique_user_code = ?'); params.push(unique_user_code); }
  if (company_name)      { conditions.push('company_name    = ?'); params.push(company_name); }
  if (branch_name)       { conditions.push('branch_name     = ?'); params.push(branch_name); }
  if (role)              { conditions.push('role            = ?'); params.push(role); }

  // Optional safety: require at least one filter
  // if (conditions.length === 0) {
  //   return res.status(400).json({ message: 'At least one filter is required.' });
  // }

  let sql = `
    SELECT
      user_id,
      username,
      title,
      first_name,
      last_name,
      role,
      company_name,
      branch_name,
      local_user_id,
      unique_user_code,
      last_login
    FROM log_in
  `;
  if (conditions.length) {
    sql += 'WHERE ' + conditions.join(' AND ');
  }

  const connection = await connect.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(sql, params);

    await connection.commit();
    res.status(200).json({ count: rows.length, data: rows });
  } catch (err) {
    await connection.rollback();
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error while fetching users.' });
  } finally {
    connection.release();
  }
});





/****************************************************************
 *  POST /company-details/save
 *  Body parameters
 *    company_name   (string, required)
 *    branch_name    (string, required)
 *    box_number     (string, optional)
 *    payment_status ('PAID' | 'NOT_PAID', optional → defaults to NOT_PAID)
 *    user_id        (int,    optional)
 ****************************************************************/
// app.post('/company-details/save', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     await connection.beginTransaction();

//     /* ─────────────────── 1. unpack & validate ────────────────── */
//     const {
//       company_name,
//       branch_name,
//       box_number,
//       payment_status,
//       user_id
//     } = req.body;

//     if (!company_name || !branch_name) {
//       await connection.rollback();
//       return res.status(400).json({
//         message: 'company_name and branch_name are required.'
//       });
//     }

//     // normalise / default the payment flag
//     const payFlag =
//       payment_status && payment_status.toUpperCase() === 'PAID'
//         ? 'PAID'
//         : 'NOT_PAID';

//     /* ─────────────────── 2. do we already have this branch? ──── */
//     const [rows] = await connection.query(
//       `SELECT company_detail_id
//          FROM company_details
//         WHERE company_name = ?
//           AND branch_name  = ?
//         LIMIT 1`,
//       [company_name, branch_name]
//     );

//     let record;                       // ← the row we will return
//     if (rows.length) {
//       /* ================ UPDATE path =========================== */
//       const id = rows[0].company_detail_id;

//       await connection.query(
//         `UPDATE company_details
//             SET box_number         = COALESCE(?, box_number),
//                 payment_status     = ?,
//                 payment_verified_at= CASE
//                                         WHEN ? = 'PAID' THEN CURRENT_TIMESTAMP
//                                         ELSE payment_verified_at
//                                      END,
//                 user_id            = ?
//           WHERE company_detail_id  = ?`,
//         [
//           box_number || null,
//           payFlag,
//           payFlag,
//           user_id || null,
//           id
//         ]
//       );

//       const [updated] = await connection.query(
//         `SELECT * FROM company_details WHERE company_detail_id = ?`,
//         [id]
//       );
//       record = updated[0];
//     } else {
//       /* ================ INSERT path =========================== */
//       const verifiedAt =
//         payFlag === 'PAID' ? new Date() : null;   // or leave NULL

//       const [result] = await connection.query(
//         `INSERT INTO company_details (
//            company_name,
//            branch_name,
//            box_number,
//            payment_status,
//            payment_verified_at,
//            user_id
//          )
//          VALUES ( ?, ?, ?, ?, ?, ? )`,
//         [
//           company_name,
//           branch_name,
//           box_number || null,
//           payFlag,
//           verifiedAt,
//           user_id || null
//         ]
//       );

//       const [inserted] = await connection.query(
//         `SELECT * FROM company_details WHERE company_detail_id = ?`,
//         [result.insertId]
//       );
//       record = inserted[0];
//     }

//     await connection.commit();

//     res.status(200).json({
//       message: rows.length
//         ? 'Company record updated successfully.'
//         : 'New company record inserted successfully.',
//       data: record
//     });
//   } catch (err) {
//     await connection.rollback();
//     console.error('Error saving company_details:', err);
//     res.status(500).json({ message: 'Server error while saving company details.' });
//   } finally {
//     connection.release();
//   }
// });

/****************************************************************
 *  POST /company-details/save
 *  Body parameters
 *    company_name   (string, required)
 *    branch_name    (string, required)
 *    box_number     (string, optional)
 *    payment_status ('PAID' | 'NOT_PAID', optional → defaults to NOT_PAID)
 *    user_id        (int,    optional)
 ****************************************************************/
app.post('/company-details/save', async (req, res) => {
  const connection = await connect.getConnection();

  try {
    await connection.beginTransaction();

    /* ─────────────────── 1. unpack & validate ────────────────── */
    const {
      company_name,
      branch_name,
      box_number,
      payment_status,
      user_id
    } = req.body;

    if (!company_name || !branch_name) {
      await connection.rollback();
      return res.status(400).json({
        message: 'company_name and branch_name are required.'
      });
    }

    // normalise / default the payment flag
    const payFlag =
      payment_status && payment_status.toUpperCase() === 'PAID'
        ? 'PAID'
        : 'NOT_PAID';

    /* ─────────────────── 2. do we already have this branch? ──── */
    const [rows] = await connection.query(
      `SELECT company_detail_id
         FROM company_details
        WHERE company_name = ?
          AND branch_name  = ?
        ORDER BY company_detail_id ASC   -- ⬅ sort by id (ascending)
        LIMIT 1`,
      [company_name, branch_name]
    );

    let record;                       // ← the row we will return
    if (rows.length) {
      /* ================ UPDATE path =========================== */
      const id = rows[0].company_detail_id;

      await connection.query(
        `UPDATE company_details
            SET box_number         = COALESCE(?, box_number),
                payment_status     = ?,
                payment_verified_at= CASE
                                        WHEN ? = 'PAID' THEN CURRENT_TIMESTAMP
                                        ELSE payment_verified_at
                                     END,
                user_id            = ?
          WHERE company_detail_id  = ?`,
        [
          box_number || null,
          payFlag,
          payFlag,
          user_id || null,
          id
        ]
      );

      const [updated] = await connection.query(
        `SELECT * FROM company_details WHERE company_detail_id = ?`,
        [id]
      );
      record = updated[0];
    } else {
      /* ================ INSERT path =========================== */
      const verifiedAt =
        payFlag === 'PAID' ? new Date() : null;   // or leave NULL

      const [result] = await connection.query(
        `INSERT INTO company_details (
           company_name,
           branch_name,
           box_number,
           payment_status,
           payment_verified_at,
           user_id
         )
         VALUES ( ?, ?, ?, ?, ?, ? )`,
        [
          company_name,
          branch_name,
          box_number || null,
          payFlag,
          verifiedAt,
          user_id || null
        ]
      );

      const [inserted] = await connection.query(
        `SELECT * FROM company_details WHERE company_detail_id = ?`,
        [result.insertId]
      );
      record = inserted[0];
    }

    await connection.commit();

    res.status(200).json({
      message: rows.length
        ? 'Company record updated successfully.'
        : 'New company record inserted successfully.',
      data: record
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error saving company_details:', err);
    res.status(500).json({ message: 'Server error while saving company details.' });
  } finally {
    connection.release();
  }
});

// /**
//  * GET /company-details/licence-check
//  * Query parameters:
//  *   companyName  (string, required)
//  *   branchName   (string, required)
//  *
//  * Returns:
//  *   { payment_status: 'PAID' | 'NOT_PAID' }
//  */
// app.get('/company-details/licence-check', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     const { companyName, branchName } = req.query;

//     // 1. validate
//     if (!companyName || !branchName) {
//       return res.status(400).json({
//         message: 'companyName and branchName are required.'
//       });
//     }

//     // 2. lookup
//     const [rows] = await connection.query(
//       `SELECT payment_status
//          FROM company_details
//         WHERE company_name = ?
//           AND branch_name  = ?
//         LIMIT 1`,
//       [companyName, branchName]
//     );

//     // 3. not found?
//     if (!rows.length) {
//       return res.status(404).json({
//         message: 'No company_details record found for that companyName/branchName.'
//       });
//     }

//     // 4. respond
//     return res.status(200).json({
//       payment_status: rows[0].payment_status
//     });

//   } catch (err) {
//     console.error('Error checking licence status:', err);
//     return res.status(500).json({
//       message: 'Server error while checking licence status.'
//     });
//   } finally {
//     connection.release();
//   }
// });


/**
 * GET /company-details/licence-check
 * Query parameters:
 *   companyName  (string, required)
 *   branchName   (string, required)
 *
 * Returns:
 *   { payment_status: 'PAID' | 'NOT_PAID' }
 */
app.get('/company-details/licence-check', async (req, res) => {
  const connection = await connect.getConnection();

  try {
    const { companyName, branchName } = req.query;

    /* ─────────────── 1. validate ─────────────── */
    if (!companyName || !branchName) {
      return res.status(400).json({
        message: 'companyName and branchName are required.'
      });
    }

    /* ─────────────── 2. lookup ───────────────── */
    const [rows] = await connection.query(
      `SELECT payment_status
         FROM company_details
        WHERE company_name = ?
          AND branch_name  = ?
        ORDER BY company_detail_id ASC   -- pick the smallest id first
        LIMIT 1`,
      [companyName, branchName]
    );

    /* ─────────────── 3. not found? ───────────── */
    if (!rows.length) {
      return res.status(404).json({
        message: 'No company_details record found for that companyName/branchName.'
      });
    }

    /* ─────────────── 4. respond ──────────────── */
    return res.status(200).json({
      payment_status: rows[0].payment_status
    });

  } catch (err) {
    console.error('Error checking licence status:', err);
    return res.status(500).json({
      message: 'Server error while checking licence status.'
    });
  } finally {
    connection.release();
  }
});


// ------------------------------------------------------------------
// 1) GET /company-details
//    List all companies with their payment status
// ------------------------------------------------------------------
app.get('/company-details', async (req, res) => {
  const connection = await connect.getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT
         company_detail_id,
         company_name,
         branch_name,
         payment_status,
         payment_verified_at,
         user_id,
         created_at,
         updated_at
       FROM company_details
       ORDER BY company_name, branch_name`
    );
    return res.status(200).json({ data: rows });
  } catch (err) {
    console.error('Error fetching company_details:', err);
    return res
      .status(500)
      .json({ message: 'Server error while retrieving companies.' });
  } finally {
    connection.release();
  }
});




// ------------------------------------------------------------------
// 2) PATCH /company-details/:id/status
//    Toggle or set a single company’s payment_status
// ------------------------------------------------------------------
app.patch('/company-details/:id/status', async (req, res) => {
  const connection = await connect.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    let { payment_status } = req.body;
    if (!payment_status) {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: 'payment_status is required in the body.' });
    }
    payment_status = payment_status.toUpperCase();
    if (!['PAID', 'NOT_PAID'].includes(payment_status)) {
      await connection.rollback();
      return res.status(400).json({
        message: "payment_status must be either 'PAID' or 'NOT_PAID'."
      });
    }

    // ensure the record exists
    const [found] = await connection.query(
      `SELECT company_detail_id
         FROM company_details
        WHERE company_detail_id = ?
        LIMIT 1`,
      [id]
    );
    if (!found.length) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: `No company found with id=${id}.` });
    }

    // perform the update
    await connection.query(
      `UPDATE company_details
          SET payment_status      = ?,
              payment_verified_at = CASE WHEN ? = 'PAID' THEN CURRENT_TIMESTAMP ELSE payment_verified_at END,
              updated_at          = CURRENT_TIMESTAMP
        WHERE company_detail_id = ?`,
      [payment_status, payment_status, id]
    );

    // read back the updated row
    const [updatedRows] = await connection.query(
      `SELECT *
         FROM company_details
        WHERE company_detail_id = ?`,
      [id]
    );

    await connection.commit();
    return res.status(200).json({
      message: 'Company status updated successfully.',
      data: updatedRows[0]
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error updating company status:', err);
    return res
      .status(500)
      .json({ message: 'Server error while updating company status.' });
  } finally {
    connection.release();
  }
});


// /**
//  * POST /smstable-deposit-log
//  * Body parameters (all required):
//  *   quantity       (int)
//  *   password_used  (string)
//  *   company_name   (string)
//  *   branch_name    (string)
//  */
// app.post('/smstable-deposit-log', async (req, res) => {
//   const connection = await connect.getConnection();

//   try {
//     await connection.beginTransaction();

//     const {
//       quantity,
//       password_used,
//       company_name,
//       branch_name
//     } = req.body;

//     // 1. validation
//     if (
//       quantity == null ||
//       !password_used ||
//       !company_name ||
//       !branch_name
//     ) {
//       await connection.rollback();
//       return res.status(400).json({
//         message:
//           'quantity, password_used, company_name and branch_name are all required.'
//       });
//     }

//     // 2. INSERT
//     const [result] = await connection.query(
//       `INSERT INTO smstable_deposit_log
//          (quantity, password_used, company_name, branch_name)
//        VALUES (?, ?, ?, ?)`,
//       [quantity, password_used, company_name, branch_name]
//     );

//     // 3. retrieve the inserted row
//     const [rows] = await connection.query(
//       `SELECT *
//          FROM smstable_deposit_log
//         WHERE deposit_id = ?`,
//       [result.insertId]
//     );
//     const record = rows[0];

//     await connection.commit();

//     // 4. respond with the new record
//     res.status(200).json({
//       message: 'Deposit log saved successfully.',
//       data: record
//     });

//   } catch (err) {
//     await connection.rollback();
//     console.error('Error saving deposit log:', err);
//     res.status(500).json({
//       message: 'Server error while saving deposit log.'
//     });

//   } finally {
//     connection.release();
//   }
// });

/****************************************************************
 *  POST /smstable-deposit-log
 *  Body parameters (all required):
 *    quantity       (int)
 *    password_used  (string)
 *    company_name   (string)
 *    branch_name    (string)
 *
 *  If a row with the same
 *  (password_used, company_name, branch_name) exists,
 *  we UPDATE it; otherwise we INSERT a new row.
 ****************************************************************/
app.post('/smstable-deposit-log', async (req, res) => {
  const conn = await connect.getConnection();
  try {
    await conn.beginTransaction();

    const {
      quantity,
      password_used,
      company_name,
      branch_name
    } = req.body;

    // 1. validation
    if (
      quantity == null ||
      !password_used ||
      !company_name ||
      !branch_name
    ) {
      await conn.rollback();
      return res.status(400).json({
        message:
          'quantity, password_used, company_name and branch_name are all required.'
      });
    }

    // 2. does a matching row already exist?
    const [existing] = await conn.query(
      `SELECT deposit_id
         FROM smstable_deposit_log
        WHERE password_used = ?
          AND company_name  = ?
          AND branch_name   = ?
        LIMIT 1`,
      [password_used, company_name, branch_name]
    );

    let record;
    if (existing.length) {
      // 3a. UPDATE path
      const id = existing[0].deposit_id;

      await conn.query(
        `UPDATE smstable_deposit_log
            SET quantity = ?,
                logged_at = CURRENT_TIMESTAMP
          WHERE deposit_id = ?`,
        [quantity, id]
      );

      const [rows] = await conn.query(
        `SELECT * FROM smstable_deposit_log WHERE deposit_id = ?`,
        [id]
      );
      record = rows[0];

    } else {
      // 3b. INSERT path
      const [result] = await conn.query(
        `INSERT INTO smstable_deposit_log
           (quantity, password_used, company_name, branch_name)
         VALUES (?, ?, ?, ?)`,
        [quantity, password_used, company_name, branch_name]
      );

      const [rows] = await conn.query(
        `SELECT * FROM smstable_deposit_log WHERE deposit_id = ?`,
        [result.insertId]
      );
      record = rows[0];
    }

    await conn.commit();

    // 4. respond with the upserted record
    res.status(200).json({
      message: existing.length
        ? 'Deposit log updated successfully.'
        : 'New deposit log saved successfully.',
      data: record
    });

  } catch (err) {
    await conn.rollback();
    console.error('Error saving deposit log:', err);
    res.status(500).json({
      message: 'Server error while saving deposit log.'
    });
  } finally {
    conn.release();
  }
});

/**
 * GET /smstable-deposit-log
 * Returns all SMS deposit log entries, most recent first.
 */
app.get('/smstable-deposit-log', async (req, res) => {
  const connection = await connect.getConnection();
  try {
    // 1) Fetch all rows, ordered by timestamp descending
    const [rows] = await connection.query(
      `SELECT
         deposit_id,
         quantity,
         password_used,
         company_name,
         branch_name,
         logged_at
       FROM smstable_deposit_log
       ORDER BY logged_at DESC`
    );

    // 2) Return them
    res.status(200).json({ data: rows });
  } catch (err) {
    console.error('Error fetching SMS deposit logs:', err);
    res.status(500).json({
      message: 'Server error while retrieving SMS deposit logs.'
    });
  } finally {
    // 3) Always release the connection
    connection.release();
  }
});



/**
 * GET /health
 *  – Returns 200 OK if the server is up
 *  – Does a quick `SELECT 1` against the main DB to test connectivity
 */
app.get('/health', async (req, res) => {
  try {
    // quick DB ping
    const [[{ '1': ok }]] = await connect.query('SELECT 1');
    if (ok !== 1) throw new Error('Unexpected response');

    return res.json({
      status:    'ok',
      database:  'ok',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Health check failed:', err);
    return res.status(500).json({
      status:   'error',
      database: 'fail',
      error:    err.message
    });
  }
});


io.on('connection', (socket) => {
  console.log('A new client connected via WebSocket');

  // Client disconnect event
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  // The WebSocket client listens to 'searchResults' event
  socket.on('search', (searchTerm) => {
    // Trigger a search on receiving a search term (if needed)
    console.log(`WebSocket search initiated with term: ${searchTerm}`);
    // Alternatively, you could call the same `selectQuery` here if you want 
    // WebSocket to independently fetch results instead of relying on the HTTP request.
  });
});





// Socket.IO connection management
io.on('connection', (socket) => {
  console.log('A new client connected');

  socket.on('register', async (phone) => {
    console.log(`Subscriber with phone ${phone} connected`);
    subscribers[phone] = socket;

    try {
      const selectQuery = `
        SELECT report_data, CONVERT_TZ(created_at, @@session.time_zone, '+00:00') AS created_at 
        FROM reports 
        WHERE phone = ? 
        AND created_at >= UTC_TIMESTAMP() - INTERVAL 8 DAY 
        ORDER BY created_at ASC
      `;
      const [results] = await connect.query(selectQuery, [phone]);

      if (results.length > 0) {
        const reportArray = results.map((report) => ({
          message: report.report_data,
          timestamp: report.created_at
        }));
        socket.emit('notification', { reports: reportArray });
      } else {
        socket.emit('notification', { message: "Welcome to pinkapple reports app. We will send you the reports as they come in." });
      }
    } catch (err) {
      console.error('Error fetching reports for the subscriber:', err);
      socket.emit('notification', { message: "An error occurred while fetching your reports. Please try again later." });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    for (let [phone, value] of Object.entries(subscribers)) {
      if (value === socket) {
        delete subscribers[phone];
        console.log(`Subscriber with phone ${phone} disconnected`);
        break;
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
