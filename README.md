# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 🗄️ Airtable Backup

Dumps all records from the **Tools** and **Categories** tables into `backups/`.

```sh
node scripts/backup-airtable.js
```

Output files: `backups/tools-YYYY-MM-DD.json` and `backups/categories-YYYY-MM-DD.json`.

Credentials are read from `.env.local.save` (never committed). Required variables:

| Variable | Description |
| :--- | :--- |
| `AIRTABLE_API_KEY` | Personal access token from airtable.com/create/tokens |
| `AIRTABLE_BASE_ID` | Base ID — found in the Airtable API docs for your base |

The `backups/` directory is in `.gitignore`.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
