# NoveList Results Sorter

A bookmarklet that collects NoveList search results, 50 at a time, into a table with book covers, authors, Goodreads ratings, publication dates, linked review counts, series information, synopses, and subjects. Column headers support cumulative sorting; the latest clicked column is primary and earlier sorts break ties.

Install both bookmarklets from https://adelechase.github.io/novelist-sorter/.

## Series information: bookmarklets only

1. Collect the NoveList search using **NoveList Sorter**.
2. Open an individual book page on Goodreads or Fantastic Fiction.
3. Run **Series Helper**, review the detected fields, then click **Save this book**.
4. Repeat for other books. **Export collected series** creates one JSON file per website.
5. In the sorter, click **Import series** and select one or both exported files.

The helper reads the Goodreads series heading above the title and Fantastic Fiction book-page metadata. A known position with no known total displays **Book 3 of ?**. A series identified by either source takes precedence over a standalone indication on the other. Unknown or conflicting metadata is not guessed. No requires standalone evidence from both sources; standalone confirmations can be entered in the helper.

Matching uses Goodreads book IDs where available, otherwise title and author together. No cross-site fetching, extension, server relay, or automatic tab opening is used. The helper reads only the page on which it is run. Saved records remain in each site's local browser storage until cleared; imports remain in the current sorter window.

The readable sources are `sorter.js`, `series-helper.js`, and the shared parser/matcher `series-tools.js`. The instruction page embeds both complete bookmarklets; no remote script is loaded by the bookmarks.

Representative Goodreads and Fantastic Fiction fixtures, helper export, multi-file import, validation, matching, and table integration were tested. Review the detected fields when trying the helper on live pages; layouts can change.
