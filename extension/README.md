# NoveList Series Companion

This Firefox extension adds cross-site series lookups to the NoveList sorter bookmarklet. It does not replace the bookmarklet or change its normal collection flow.

## Test installation

1. Download this repository using **Code → Download ZIP**, then extract it.
2. In Firefox, open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on** and select `extension/manifest.json`.
4. Reload NoveList and install the updated bookmarklet from https://adelechase.github.io/novelist-sorter/.
5. Collect your results, then click **Check series (both sources)**.

The temporary add-on lasts until Firefox restarts. Permanent installation requires Mozilla signing; this package is not yet signed.

## Results

- **Yes**: at least one source identifies a series, but no usable book number is available.
- **Book 3**: a position is known, but a primary-work count is not.
- **Book 3 of 5**: a position and explicit primary-work count are known.
- **No**: both readable records give negative series evidence.
- **Unknown**: a source cannot be read or cannot be matched, and neither source establishes a series.

Hover over a Series cell for source notes. Conflicting book numbers display **Yes** rather than choosing an arbitrary position. Counts are primary works reported at the time of checking, not a promise that a series is complete.

## Behavior

Checks run sequentially. The extension opens NoveList and Goodreads records in background tabs, reads series metadata, then closes its own tabs. When the result has no Goodreads link, it tries a Goodreads search and accepts only a unique exact title/author match. It may also open the Goodreads series page for an explicit primary-work count. Stop cancels the current lookup and retains completed rows.

No third-party relay, analytics, or remote code is used. Only HTTPS record requests on research.ebsco.com and Goodreads are permitted. Blocked Goodreads pages remain Unknown; bot checks are not bypassed.

Series parsers, data merging, simulated tab lifecycle, matching, and sorter integration were tested with fixtures. Live NoveList detail rendering and Goodreads access still need testing from the library.
