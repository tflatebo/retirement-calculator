# Plan

## Bug fix: Fix math bug
- when viewing the popup data table on the pre-tax annount, the math still doesn't make any sense
- this is the thrid time I asked you to look at this, I need you to take a deeper look
- these accounts shoudl have ledgers, the ledgers shoudl follow basic math principles
- right now, if I look at the pre-tax and cash, the math doesn't make sense, the inflows and outflows do not equal the final balance, and the pre-tax is showing $0 starting balance in the table, but in the overlay table, it shows having a non-zero starting balance, and in the roth account, for one year it shows an opening balance of $1.2M, growth of $47k, and an ending balance of $671k. Are you even using basic accounting math for this?
- Do some research and figure out how to model these account properly so that you are using double-entry ledger logic
- Find out why this is happening, write tests for how this should work, then fix the logic in the code