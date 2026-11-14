# 24 Heelz NG — online store

## Run it

1. Install Node.js 18 or newer (https://nodejs.org).
2. In this folder run: `node server.js`
3. Open http://localhost:3000 (admin: http://localhost:3000/#admin)

Default admin login: Kenny / 1234richard. Change it in Admin > Settings straight after first login.

## Where data lives

Products, orders and admin settings are stored in `data/db.json`. Product photos are stored in `data/uploads/`.
Back up the whole `data/` folder. Orders from every customer arrive in the admin dashboard.

## Put it online

Use any host that runs Node and has a persistent disk (a VPS, Render, Railway, Fly.io).

- Start command: `node server.js`
- Set the PORT environment variable if the host asks for it.
- Set DATA_DIR to a persistent disk path so db.json survives redeploys.
- Use HTTPS (the host usually provides it) because the admin password is sent on login.

## How orders work

Customer selects pairs > ORDER NOW > fills details > order is saved in the admin dashboard
and the customer is shown bank-transfer payment instructions.
The dashboard checks for new orders every 15 seconds. Confirming an order reduces stock.

## Adding real photos (do this before launch)

1. Log in at /#admin > Products.
2. Fastest: click "Add from photos", select many pictures at once. One product is created per photo. Then open each one and set name, price, stock, heel height, material and availability.
3. Or open a product > Photos > choose several pictures. The first photo is the main one; click a photo to make it main.
4. The launch catalogue contains 108 heel styles and 48 bags with editorial reference photos. Open any product to replace its photo, title, price, stock, sizes and product information with your verified stock before launch.

## Catalogue and photos

The shop separates heels and bags, while both are managed from the same Admin > Products area. Each listing has a photo gallery; upload your own photographs to make the first image the main catalogue image. The supplied launch photos are external editorial placeholders, so replace them with your own product photography or supplier-approved imagery before a public launch.

## Editing page text

Admin > Settings controls the About, Delivery, Returns and Payment text, plus phone, address, opening hours and Instagram.
These pages show your text: About, Delivery & returns, FAQ, Contact. Check every line is true for the business before launch.

# 24heels
