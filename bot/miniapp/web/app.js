// Donation Mini App. Telegram signs the init data; the tgcloud endpoints verify it before running,
// so `me` doubles as the login and `donate` can trust the caller's user id.
const app = window.Telegram.WebApp;
const WORDS_URL = 'https://words-sv.vercel.app';
const TIERS = [25, 50, 100, 250, 500];

const TEXT = {
  de: {
    title: 'WordCircle unterstützen',
    hello: (name) => `Hallo ${name}, danke, dass du vorbeischaust!`,
    intro: 'WordCircle bleibt kostenlos und ohne Werbung. Wenn dir die App hilft, kannst du ihre Entwicklung freiwillig mit Telegram Stars unterstützen.',
    note: 'Freiwillige Spende, keine Gegenleistung, keine Erstattung.',
    openApp: '📚 WordCircle öffnen',
    terms: 'Bedingungen', privacy: 'Datenschutz', imprint: 'Impressum',
    paid: '💛 Danke für deine Spende!',
    cancelled: 'Spende abgebrochen.',
    failed: 'Die Zahlung hat nicht geklappt. Bitte versuche es noch einmal.',
    offline: 'Bitte öffne diese Seite über den Bot @word_circle_bot in Telegram.'
  },
  en: {
    title: 'Support WordCircle',
    hello: (name) => `Hi ${name}, thanks for stopping by!`,
    intro: 'WordCircle stays free and ad-free. If the app helps you, you can voluntarily support its development with Telegram Stars.',
    note: 'Voluntary donation, nothing in return, no refunds.',
    openApp: '📚 Open WordCircle',
    terms: 'Terms', privacy: 'Privacy', imprint: 'Legal notice',
    paid: '💛 Thank you for your donation!',
    cancelled: 'Donation cancelled.',
    failed: 'The payment did not go through. Please try again.',
    offline: 'Please open this page through @word_circle_bot in Telegram.'
  }
};

const lang = (app.initDataUnsafe?.user?.language_code ?? navigator.language ?? '').startsWith('de') ? 'de' : 'en';
const text = TEXT[lang];
const status = document.getElementById('status');

document.documentElement.lang = lang;
for (const element of document.querySelectorAll('[data-i18n]')) {
  const value = text[element.dataset.i18n];
  if (typeof value === 'string') element.textContent = value;
}

function call(name, input) {
  return new Promise((resolve, reject) => {
    app.Serverless.call(name, input, (error, result) => (error ? reject(error) : resolve(result)));
  });
}

function setBusy(busy) {
  for (const button of document.querySelectorAll('#tiers button')) button.disabled = busy;
}

async function donate(amount) {
  setBusy(true);
  status.textContent = '';
  try {
    const { link } = await call('donate', { amount });
    app.openInvoice(link, (result) => {
      setBusy(false);
      if (result === 'paid') {
        status.textContent = text.paid;
        app.HapticFeedback?.notificationOccurred('success');
      } else {
        status.textContent = result === 'cancelled' ? text.cancelled : text.failed;
      }
    });
  } catch (error) {
    setBusy(false);
    status.textContent = text.failed;
    console.error(error);
  }
}

const tiers = document.getElementById('tiers');
for (const amount of TIERS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = `⭐ ${amount}`;
  button.addEventListener('click', () => donate(amount));
  tiers.append(button);
}

document.getElementById('open-app').addEventListener('click', () => app.openLink ? app.openLink(WORDS_URL) : window.open(WORDS_URL));
for (const link of document.querySelectorAll('footer a')) {
  link.addEventListener('click', (event) => { event.preventDefault(); app.openLink(link.href); });
}

app.ready();
app.expand();

if (!app.initData) {
  status.textContent = text.offline;
  setBusy(true);
} else {
  call('me', {})
    .then((me) => { document.getElementById('greeting').textContent = text.hello(me.firstName); })
    .catch((error) => console.error(error));
}
