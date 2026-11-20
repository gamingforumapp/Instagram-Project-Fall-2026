import { expect, test } from '@playwright/test'

test.describe('Profile Username Editing & Cooldown', () => {
  test('redirects unauthenticated users to login page', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/login\?next=\/profile/)
  })

  test('opens edit modal in preview mode and displays username field with 7-day rule', async ({
    page,
  }) => {
    page.on('console', (msg) => console.log(`BROWSER CONSOLE: ${msg.type()}: ${msg.text()}`))
    page.on('pageerror', (err) => console.log(`BROWSER ERROR: ${err.message}`))

    await page.goto('/profile?preview=true')
    await page.waitForLoadState('networkidle')

    const editBtn = page.getByRole('button', { name: 'Edit profile' })
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    // Wait a brief moment for React state transition
    await page.waitForTimeout(500)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole('heading', { name: 'Edit gamer profile' })
    ).toBeVisible()

    const usernameInput = dialog.locator('input[placeholder="your_username"]')
    await expect(usernameInput).toBeVisible()
    await expect(usernameInput).toHaveAttribute('maxLength', '30')

    await expect(
      dialog.getByText(
        'Must be unique. Once changed, you must wait 7 days before changing it again.'
      )
    ).toBeVisible()
  })
})
