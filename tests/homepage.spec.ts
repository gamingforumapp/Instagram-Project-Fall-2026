import { expect, test } from '@playwright/test'

test('homepage shows the main hero heading', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Good games. Better company.' })
  ).toBeVisible()
})
