import { expect, test } from '@playwright/test'

test.describe('Profile Username Editing & Cooldown', () => {
  test('redirects unauthenticated users to login page', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/login\?next=\/profile/)
  })

  test('opens edit modal in preview mode and displays username field with 7-day rule, button, and error display', async ({
    page,
  }) => {
    await page.goto('/profile?preview=true')
    await page.waitForLoadState('networkidle')

    const editBtn = page.getByRole('button', { name: 'Edit profile' })
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    await page.waitForTimeout(500)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(
      dialog.getByRole('heading', { name: 'Edit gamer profile' })
    ).toBeVisible()

    // Verify username input
    const usernameInput = dialog.locator('input[placeholder="your_username"]')
    await expect(usernameInput).toBeVisible()
    await expect(usernameInput).toHaveAttribute('maxLength', '30')

    // Verify Change username button exists
    const changeBtn = dialog.getByRole('button', { name: 'Change username' })
    await expect(changeBtn).toBeVisible()

    // Verify subnote mentioning usernames can be changed once every 7 days
    await expect(
      dialog.getByText('Subnote: Usernames can be changed once every 7 days.')
    ).toBeVisible()

    // Test entering a different invalid username to verify red alert text
    await usernameInput.fill('ab')
    await usernameInput.blur()
    await page.waitForTimeout(300)

    // Verify red error text appears
    const alert = dialog.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toHaveClass(/text-red-500/)
    await expect(alert).toContainText('Username must be 3–30 characters')
  })
})
