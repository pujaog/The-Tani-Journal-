from playwright.sync_api import sync_playwright

URL = 'http://localhost:3000'


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        logs = []

        def on_console(msg):
            logs.append((msg.type, msg.text))
        page.on('console', on_console)

        page.goto(URL, wait_until='networkidle')
        title = page.title()
        print('Title:', title)
        # Open sign in flow to ensure client scripts run
        page.click('text=Sign in', timeout=5000)
        page.wait_for_timeout(1000)
        print('Collected console logs:')
        for t, m in logs:
            print(t, m)
        browser.close()

if __name__ == '__main__':
    run()
