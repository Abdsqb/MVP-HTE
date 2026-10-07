# Formwise

**AI paperwork helper for insurance agencies.**

Insurance agencies get messy client paperwork (forms, emails, faxes, handwritten notes) and then retype the same information into many different insurance company websites. Formwise does the boring part:

1. **Collect:** upload a client's PDF. AI reads it and builds a client profile.
2. **Organize:** review the profile. Anything the AI wasn't sure about is highlighted, with where it came from.
3. **Submit:** a Chrome extension fills each insurance website's form from the profile. You check it and press submit yourself.

Once Formwise has learned a website's form, filling it again is instant and doesn't use AI at all.

> This is an MVP demo. The three "insurance websites" and all sample documents are fictional.

---

## What you need

- [Node.js](https://nodejs.org) 20 or newer
- Google Chrome (or Edge)
- A free **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey) (or an Anthropic Claude key)

## Setup

```bash
npm install
```

Copy `.env.local.example` to a new file called `.env.local` and paste your key:

```
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-3.5-flash-lite
```

Start the app:

```bash
npm run dev
```

Open **http://localhost:3000**.

## Install the Chrome extension

1. Go to `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and pick the `extension` folder in this project
4. Pin the Formwise icon. Clicking it should say "Connected"

## Try it

1. **Upload:** go to the Upload page and click one of the sample documents.
2. **Review:** fix or confirm the highlighted fields, then click **Mark reviewed**.
3. **Fill:** click **Demo portals** (top right), open a portal, pick your client in the Formwise panel (bottom right) and click **Fill this page**.
4. **Submit:** check the amber fields, then submit the form. The timer at the bottom left records how long it took.
5. **Results:** the Dashboard compares "by hand" vs "with Formwise" times. The Portal library and Audit log show what was learned and filled.

Tip: fill a portal once by hand (without the extension) to get the "by hand" time for comparison.

## What's in the project

| Folder | What it is |
|---|---|
| `app/` | The web app pages and API |
| `components/` | UI pieces (upload, review screen, library) |
| `lib/` | AI prompts, the form-filling logic, and data storage |
| `extension/` | The Chrome extension |
| `samples/` | Fictional client PDFs to try (rebuild with `npm run samples`) |
| `data/` | Your local clients, learned forms and logs (not uploaded to GitHub) |

## Good to know

- **Privacy:** on the free Gemini tier, Google may use what you send to improve its products. Only use the fictional samples on a free key, not real client documents.
- **Free tier limits:** each uploaded document is 1 AI request, and learning a new form is 1 request per form (or per wizard step). Filling a form you've already learned uses none.
- **Nothing is submitted for you.** Formwise fills and highlights; a person always reviews and submits.
