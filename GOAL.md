# Plan

## Bug fix: Fix math bug
- when viewing the popup data table on the pre-tax annount, the math doesn't make any sense
- the starting balance is $0, and the popup shows that there is investment growth of +$14k, withdrawal of -$49k, and cash replenishment of -$19k, this cannot be correct
- i want you to review alll of the math
- i want each account to maintain a ledger just like an accounting system, with common sense rules where you cannot withdraw if the account is <=$0
- also, I want to see the net for each year on all accounts, not just the total

## Bug fix: Check on the feature for volatility
- if I move the volatility down, my final balance at the end of the plan goes up
- This doesn't make sense to me, I would expect it to go down since the return rate on bonds is lower than stocks (usually)
- Make sure that you are modeling the return rate of bonds and stocks separately
- the return rate in the UI is for stocks, I have no idea what it should be for bonds, expose soemthing but set a sane default value

## Feature: Create a separate return rate for cash
- cash investment returns are usually just slightly above inflation
- Similar to bonds, use a separate rate of return and set a sane default
- then update the math models to use that for cash rate investment returns