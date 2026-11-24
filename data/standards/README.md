# Standards data

Official K–12 standards for the standards picker, copied from PlanSlate's `data/standards`, which downloads them from the [Common Standards Project](https://commonstandardsproject.com):

- `ccss.json`: Common Core State Standards (Mathematics, English Language Arts & Literacy)
- `ngss.json`: Next Generation Science Standards
- `ca.json`: California's own standards (every subject the project has, including CTE)

`npm run standards:load` puts them in the database (`npm run db:seed` does too). Entries without a code, such as "(Begins in grade 3)", are skipped.

**License.** The standards come from the Achievement Standards Network (ASN), © D2L Corporation, licensed [CC BY 3.0 US](http://creativecommons.org/licenses/by/3.0/us/), via the Common Standards Project. The app credits them in the standards picker.
