// Auction House markup for tradable item pages (used by gen-dungeon.js and gen-profession.js).
// The page only carries placeholders with the item ID; site/assets/ah-price.js fills them in on load
// with the price for the reader's region, ruleset and faction.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Soulbound and quest items never reach the auction house. Unknown binding counts as tradable:
// the widget just reports no listings if nobody sells it.
const isTradable = (it) =>
  Boolean(it.item_id) && it.source_type !== 'quest_item' && !/picked up|^bop$|quest item|account/i.test(it.binding || '');

const infoboxRow = (id) => `      <tr><th>Auction House</th><td class="ah-summary" data-item-id="${esc(id)}"><span class="unknown">?</span></td></tr>`;

const section = (id) => `    <h2 id="Auction_House">Auction House</h2>
    <div class="ah-price" data-item-id="${esc(id)}">
      <p class="ah-status">Auction House prices need JavaScript.</p>
    </div>`;

module.exports = { isTradable, infoboxRow, section, toc: ['Auction_House', 'Auction House'] };
