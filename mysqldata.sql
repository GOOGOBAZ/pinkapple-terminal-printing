
DROP PROCEDURE IF EXISTS agingAnalysisSimple;

DELIMITER ##

CREATE PROCEDURE agingAnalysisSimple()
BEGIN
    DECLARE l_done INT;
    DECLARE TrnId INT;
    DECLARE LoanId VARCHAR(20);
    DECLARE customerName VARCHAR(60);
    DECLARE customerContactNumber VARCHAR(60);
    DECLARE theLoanStatus VARCHAR(20);
    DECLARE gaurantorName1 VARCHAR(100);
    DECLARE gaurantorContact1 VARCHAR(100);
    DECLARE gaurantorName2 VARCHAR(100);
    DECLARE gaurantorContact2 VARCHAR(100);
    DECLARE remainport DOUBLE;
    DECLARE princeremain DOUBLE;
    DECLARE interestRem DOUBLE;
    DECLARE p_remain,loanTaken,totalRem,amount_arrears,P,I DOUBLE;
    DECLARE i_remain DOUBLE;
    DECLARE arrears INT;
    DECLARE TrnDate DATE;

    -- Cursor for loan IDs with status 'Disbursed' or 'Renewed'
    DECLARE forSelectingLoanIds CURSOR FOR
        SELECT DISTINCT trn_id
        FROM new_loan_appstore
        WHERE loan_cycle_status IN ('Disbursed', 'Renewed');
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET l_done = 1;

    -- Temporary table for aging analysis
    DROP TABLE IF EXISTS aging_loan_analysis;
    CREATE TEMPORARY TABLE aging_loan_analysis (
        id INT NOT NULL AUTO_INCREMENT,
        trn_id INT,
        loan_id VARCHAR(20),
        customer_name VARCHAR(60),
        customer_contact VARCHAR(60),
        gaurantor1_name VARCHAR(100),
        gaurantor1_contact VARCHAR(100),
        gaurantor2_name VARCHAR(100),
        gaurantor2_contact VARCHAR(100),
        date_taken DATE,
        due_date DATE,
        loan_taken DOUBLE,
        principal_remaining DOUBLE,
        interest_remaining DOUBLE,
        total_remaining DOUBLE,
        total_inarrears DOUBLE,
        number_of_days_in_arrears INT,
        loan_status VARCHAR(20),
        PRIMARY KEY (id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8;

    -- Open cursor and start loop
    OPEN forSelectingLoanIds;
    accounts_loop: LOOP
        FETCH forSelectingLoanIds INTO TrnId;
        IF l_done THEN
            LEAVE accounts_loop;
        END IF;

        -- Reset variables for each loan
        SET customerName = NULL, customerContactNumber = NULL, theLoanStatus = NULL;
        SET gaurantorName1 = NULL, gaurantorContact1 = NULL, gaurantorName2 = NULL, gaurantorContact2 = NULL;
        SET remainport = 0, princeremain = 0, interestRem = 0, p_remain = 0, i_remain = 0, arrears = 0;

        -- Fetch main loan details
        SELECT pl.loan_id, applicant_account_name, m.mobile1, pl.trn_date,
               pl.princimpal_amount, pl.TotalPrincipalRemaining, pl.TotalInterestRemaining,
              pl.balance_due, pl.loan_cycle_status
        INTO LoanId, customerName, customerContactNumber, TrnDate, loanTaken,
             princeremain, interestRem, totalRem, theLoanStatus
        FROM pmms.master m
        INNER JOIN pmms_loans.new_loan_appstore pl ON pl.applicant_account_number = m.account_number
        WHERE pl.trn_id = TrnId;

        -- Calculate remaining amounts and arrears
        SELECT SUM(PrincipalRemaining) ,SUM(InterestRemaing),(SUM(PrincipalRemaining) + SUM(InterestRemaing)), numberOfDayInArrears(LoanId)
        INTO P,I, amount_arrears, arrears
        FROM new_loan_appstoreamort
        WHERE master1_id = TrnId AND instalment_due_date <= DATE(NOW()) AND NOT instalment_status = 'P';
/* SELECT P,I,  amount_arrears; */
        -- Fetch guarantors
        SELECT gaurantorsName, gaurantorsContact1 INTO gaurantorName1, gaurantorContact1
        FROM gaurantors
        WHERE loanTrnId = LoanId
        ORDER BY id ASC
        LIMIT 1;

        SELECT gaurantorsName, gaurantorsContact1 INTO gaurantorName2, gaurantorContact2
        FROM gaurantors
        WHERE loanTrnId = LoanId
        ORDER BY id DESC
        LIMIT 1;

        -- Insert data into consolidated table
        INSERT INTO aging_loan_analysis (
            trn_id,loan_id, customer_name, customer_contact, gaurantor1_name, gaurantor1_contact, 
            gaurantor2_name, gaurantor2_contact, date_taken, due_date, loan_taken, 
            principal_remaining, interest_remaining,total_remaining,total_inarrears,number_of_days_in_arrears, loan_status
        )
        VALUES (
            TrnId,LoanId, customerName, customerContactNumber, gaurantorName1, gaurantorContact1,
            gaurantorName2, gaurantorContact2, TrnDate, DATE_ADD(TrnDate, INTERVAL 30 DAY),
            loanTaken, princeremain, interestRem, totalRem, amount_arrears, arrears, theLoanStatus
        );

        SET l_done = 0;
    END LOOP;

    CLOSE forSelectingLoanIds;

    -- Select data categorized by aging period
    SELECT * FROM aging_loan_analysis ORDER BY loan_status, number_of_days_in_arrears;

END ##


DELIMITER ;