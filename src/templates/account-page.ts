import { html } from "hono/html";

interface AccountPageProps {
  email: string;
  passwordError?: string;
  passwordSuccess?: boolean;
  emailError?: string;
  emailSuccess?: boolean;
  dsgvoError?: string;
  dsgvoSuccess?: boolean;
}

interface SetupPageProps {
  error?: string;
}

function successBanner(message: string) {
  return html`
    <div class="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700" role="status">
      ${message}
    </div>
  `;
}

function errorBanner(message: string) {
  return html`
    <div class="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
      ${message}
    </div>
  `;
}

export function renderPasswordForm(error?: string, success?: boolean) {
  return html`
    <div id="passwort-form">
      <h2 class="text-lg font-semibold mb-4">Passwort ändern</h2>
      ${success ? successBanner("Passwort wurde erfolgreich geändert.") : ""}
      ${error ? errorBanner(error) : ""}
      <form
        hx-post="/einstellungen/konto/passwort"
        hx-target="#passwort-form"
        hx-swap="outerHTML"
        class="space-y-4"
      >
        <div>
          <label for="current_password" class="block text-sm font-medium text-text-primary mb-1">
            Aktuelles Passwort *
          </label>
          <input
            type="password"
            id="current_password"
            name="current_password"
            required
            autocomplete="current-password"
            class="w-full rounded border border-border-medium bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label for="new_password" class="block text-sm font-medium text-text-primary mb-1">
            Neues Passwort *
          </label>
          <input
            type="password"
            id="new_password"
            name="new_password"
            required
            minlength="8"
            autocomplete="new-password"
            class="w-full rounded border border-border-medium bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p class="mt-1 text-xs text-text-muted">Mindestens 8 Zeichen</p>
        </div>
        <div>
          <label for="new_password_confirm" class="block text-sm font-medium text-text-primary mb-1">
            Neues Passwort bestätigen *
          </label>
          <input
            type="password"
            id="new_password_confirm"
            name="new_password_confirm"
            required
            minlength="8"
            autocomplete="new-password"
            class="w-full rounded border border-border-medium bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div class="flex justify-end pt-2">
          <button
            type="submit"
            class="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
          >
            Passwort ändern
          </button>
        </div>
      </form>
    </div>
  `;
}

export function renderEmailForm(currentEmail: string, error?: string, success?: boolean) {
  return html`
    <div id="email-form">
      <h2 class="text-lg font-semibold mb-4">E-Mail-Adresse ändern</h2>
      ${success ? successBanner("E-Mail-Adresse wurde erfolgreich geändert.") : ""}
      ${error ? errorBanner(error) : ""}
      <form
        hx-post="/einstellungen/konto/email"
        hx-target="#email-form"
        hx-swap="outerHTML"
        class="space-y-4"
      >
        <div>
          <label for="new_email" class="block text-sm font-medium text-text-primary mb-1">
            Neue E-Mail-Adresse *
          </label>
          <input
            type="email"
            id="new_email"
            name="new_email"
            required
            autocomplete="email"
            value="${currentEmail}"
            class="w-full rounded border border-border-medium bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p class="mt-1 text-xs text-text-muted">Aktuelle E-Mail: ${currentEmail}</p>
        </div>
        <div>
          <label for="email_password" class="block text-sm font-medium text-text-primary mb-1">
            Passwort zur Bestätigung *
          </label>
          <input
            type="password"
            id="email_password"
            name="password"
            required
            autocomplete="current-password"
            class="w-full rounded border border-border-medium bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div class="flex justify-end pt-2">
          <button
            type="submit"
            class="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
          >
            E-Mail ändern
          </button>
        </div>
      </form>
    </div>
  `;
}

export function renderAccountPage({
  email,
  passwordError,
  passwordSuccess,
  emailError,
  emailSuccess,
  dsgvoError,
  dsgvoSuccess,
}: AccountPageProps) {
  return html`
    <div class="max-w-2xl space-y-8">
      <div class="flex items-center gap-4 border-b border-border-subtle mb-2">
        <a href="/einstellungen" class="pb-3 text-sm font-medium text-text-secondary hover:text-text-primary border-b-2 border-transparent">Firma</a>
        <a href="/einstellungen/konto" class="pb-3 text-sm font-medium border-b-2 border-primary text-primary">Konto</a>
      </div>
      <div>
        <h1 class="text-2xl font-semibold mb-1">Konto</h1>
        <p class="text-sm text-text-secondary">Verwalte deine Zugangsdaten.</p>
      </div>

      <div class="rounded-lg border border-border-subtle bg-bg-surface p-6">
        <div class="mb-2 text-sm text-text-muted">Angemeldet als</div>
        <div class="font-medium text-text-primary">${email}</div>
      </div>

      <div class="rounded-lg border border-border-subtle bg-bg-surface p-6">
        ${renderPasswordForm(passwordError, passwordSuccess)}
      </div>

      <div class="rounded-lg border border-border-subtle bg-bg-surface p-6">
        ${renderEmailForm(email, emailError, emailSuccess)}
      </div>

      <div class="rounded-lg border border-border-subtle bg-bg-surface p-6">
        <h2 class="text-lg font-semibold mb-4">Abmelden</h2>
        <p class="text-sm text-text-secondary mb-4">
          Beende deine aktuelle Sitzung.
        </p>
        <form method="POST" action="/auth/logout">
          <button
            type="submit"
            class="rounded border border-border-medium bg-bg-primary px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
          >
            Abmelden
          </button>
        </form>
      </div>

      <div class="rounded-lg border-2 border-red-200 bg-red-50 p-6">
        <h2 class="text-lg font-semibold mb-2 text-red-900">Datenschutz & Datenlöschung</h2>
        <p class="text-sm text-red-800 mb-4">
          Gemäß DSGVO hast du das Recht auf Datenexport (Art. 20) und Datenlöschung (Art. 17).
        </p>
        ${dsgvoError ? errorBanner(dsgvoError) : ""}
        ${dsgvoSuccess ? successBanner("Datenexport erfolgreich heruntergeladen.") : ""}
        <div class="space-y-3">
          <div>
            <h3 class="text-sm font-semibold text-red-900 mb-2">Datenexport</h3>
            <p class="text-xs text-red-800 mb-3">
              Lade eine Kopie aller deiner Geschäftsdaten herunter (JSON-Format).
            </p>
            <form method="POST" action="/einstellungen/dsgvo/export">
              <button
                type="submit"
                class="rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              >
                Daten exportieren
              </button>
            </form>
          </div>
          <hr class="border-red-200" />
          <div>
            <h3 class="text-sm font-semibold text-red-900 mb-2">Datenlöschung (nicht rückgängig zu machen)</h3>
            <p class="text-xs text-red-800 mb-3">
              Löscht dein Konto und alle Geschäftsdaten dauerhaft. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <button
              type="button"
              onclick="document.getElementById('dsgvo-delete-modal').showModal()"
              class="rounded border border-red-600 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            >
              Alles löschen
            </button>
            <dialog id="dsgvo-delete-modal" class="rounded-lg border border-border-subtle bg-bg-surface p-6 shadow-lg">
              <h3 class="text-lg font-semibold text-red-900 mb-4">Datenlöschung bestätigen</h3>
              <p class="text-sm text-text-secondary mb-4">
                Du bist im Begriff, dein Konto und alle Geschäftsdaten zu löschen. Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <form method="POST" action="/einstellungen/dsgvo/loeschen" class="space-y-4">
                <div>
                  <label for="delete_password" class="block text-sm font-medium text-text-primary mb-1">
                    Passwort zur Bestätigung *
                  </label>
                  <input
                    type="password"
                    id="delete_password"
                    name="password"
                    required
                    autocomplete="current-password"
                    class="w-full rounded border border-border-medium bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <div class="flex gap-3 justify-end">
                  <button
                    type="button"
                    onclick="document.getElementById('dsgvo-delete-modal').close()"
                    class="rounded border border-border-medium bg-bg-primary px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    class="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  >
                    Endgültig löschen
                  </button>
                </div>
              </form>
            </dialog>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderAccountSetupPage({ error }: SetupPageProps) {
  return html`
    <div class="max-w-lg">
      <h1 class="text-2xl font-semibold mb-2">Konto einrichten</h1>
      <p class="text-sm text-text-secondary mb-6">
        Lege dein Anmeldekonto an. Nach der Einrichtung ist eine Anmeldung beim Öffnen von FREA erforderlich.
      </p>

      ${error ? errorBanner(error) : ""}

      <div class="rounded-lg border border-border-subtle bg-bg-surface p-6">
        <form
          hx-post="/einstellungen/konto/einrichten"
          hx-target="#account-setup-result"
          hx-swap="outerHTML"
          class="space-y-4"
        >
          <div id="account-setup-result"></div>
          <div>
            <label for="setup_email" class="block text-sm font-medium text-text-primary mb-1">
              E-Mail-Adresse *
            </label>
            <input
              type="email"
              id="setup_email"
              name="email"
              required
              autocomplete="email"
              class="w-full rounded border border-border-medium bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="deine@email.de"
            />
          </div>
          <div>
            <label for="setup_password" class="block text-sm font-medium text-text-primary mb-1">
              Passwort *
            </label>
            <input
              type="password"
              id="setup_password"
              name="password"
              required
              minlength="8"
              autocomplete="new-password"
              class="w-full rounded border border-border-medium bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p class="mt-1 text-xs text-text-muted">Mindestens 8 Zeichen</p>
          </div>
          <div>
            <label for="setup_password_confirm" class="block text-sm font-medium text-text-primary mb-1">
              Passwort bestätigen *
            </label>
            <input
              type="password"
              id="setup_password_confirm"
              name="password_confirm"
              required
              minlength="8"
              autocomplete="new-password"
              class="w-full rounded border border-border-medium bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div class="flex justify-end pt-2">
            <button
              type="submit"
              class="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
            >
              Konto anlegen
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}
