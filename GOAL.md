# Plan

## Bug fix: Fix bug in YoY dtail table
- when viewing the popup data table on the pre-tax annount, the math still doesn't make any sense
- this is the fourth time I asked you to look at this, I need you to take a deeper look
- right now, if I look at the any of the accounts, the display in the table shows $0, but the overlay/popup shows a non-zero opening and finishing balance
- I can't tell if this is a bug in the math/ledger, or just showing two different values, one from dterministic and one from median
- If this is just a display bug, make sure that everywhere any value is displayed in the table, including the overlay that it respects the value selected at the top of the table
- If this is a math bug, I want you to come up with a solid plan to ensure this cannot happen again. If this includes using a local DB (simple sqlite file based for now), then do that 