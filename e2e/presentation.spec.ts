import { test, expect, type Page } from '@playwright/test';

// presentation.spec.ts - Interactive Demo Bot for Thai Energy Planner

// Helper function to show a custom UI overlay and wait for a "Next" click
async function showStepAndWait(page: Page, text: string) {
  await page.evaluate((msg) => {
    let container = document.getElementById('demo-bot-container');
    if (!container) {
      // Create the floating card
      container = document.createElement('div');
      container.id = 'demo-bot-container';
      container.style.position = 'fixed';
      container.style.bottom = '30px';
      container.style.right = '30px';
      container.style.zIndex = '999999';
      container.style.backgroundColor = '#ffffff';
      container.style.border = '2px solid #f97316';
      container.style.padding = '24px';
      container.style.borderRadius = '16px';
      container.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
      container.style.maxWidth = '450px';
      container.style.fontFamily = '"Prompt", sans-serif';
      
      const titleEl = document.createElement('h3');
      titleEl.innerText = '🤖 Demo Bot';
      titleEl.style.margin = '0 0 10px 0';
      titleEl.style.color = '#f97316';
      titleEl.style.fontSize = '18px';
      
      const textEl = document.createElement('p');
      textEl.id = 'demo-bot-text';
      textEl.style.margin = '0 0 20px 0';
      textEl.style.fontSize = '16px';
      textEl.style.color = '#333333';
      textEl.style.lineHeight = '1.5';
      
      const btn = document.createElement('button');
      btn.id = 'demo-bot-next';
      btn.innerText = 'ต่อไป (Next) ⏭️';
      btn.style.backgroundColor = '#f97316';
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.padding = '12px 24px';
      btn.style.borderRadius = '8px';
      btn.style.cursor = 'pointer';
      btn.style.fontWeight = 'bold';
      btn.style.fontSize = '16px';
      btn.style.width = '100%';
      btn.style.transition = 'background-color 0.2s';
      
      btn.onmouseover = () => { btn.style.backgroundColor = '#ea580c'; };
      btn.onmouseout = () => { btn.style.backgroundColor = '#f97316'; };
      
      // Global variable to track clicks
      (window as any)['demoBotNextClicked'] = false;
      btn.onclick = () => { 
        (window as any)['demoBotNextClicked'] = true; 
        btn.innerText = 'กำลังประมวลผล...';
        btn.style.opacity = '0.7';
      };
      
      container.appendChild(titleEl);
      container.appendChild(textEl);
      container.appendChild(btn);
      document.body.appendChild(container);
    }
    
    // Update text and reset button state
    document.getElementById('demo-bot-text')!.innerText = msg;
    const btn = document.getElementById('demo-bot-next') as HTMLButtonElement;
    btn.innerText = 'ต่อไป (Next) ⏭️';
    btn.style.opacity = '1';
    (window as any)['demoBotNextClicked'] = false;
  }, text);

  // Wait indefinitely until the user clicks the "Next" button
  await page.waitForFunction(() => (window as any)['demoBotNextClicked'] === true, null, { timeout: 0 });
}

test('Interactive Presentation Demo', async ({ page }) => {
  // 1. Start at the home page
  await page.goto('/');
  await expect(page).toHaveTitle(/Thai Energy Planner/);
  await showStepAndWait(page, "ยินดีต้อนรับสู่ Thai Energy Planner ระบบวิเคราะห์การใช้ไฟฟ้าและความคุ้มค่าด้านพลังงานครบวงจรครับ! (กดปุ่มต่อไปเมื่อพร้อม)");
  
  // 2. Go to Load Data (Bills)
  await page.goto('/analysis/load-data/bills');
  await page.waitForTimeout(1000);
  await showStepAndWait(page, "ในหน้านี้ เราจะนำเข้าข้อมูลค่าไฟ ระบบนี้ออกแบบมาให้รองรับการกรอกข้อมูลบิลค่าไฟแบบรายเดือนครับ");
  
  // Simulate filling in a bill (or modifying the last one)
  const addMonthBtn = page.getByRole('button', { name: /\+ เพิ่มเดือน|เพิ่มบิลค่าไฟ/i });
  if (await addMonthBtn.isVisible()) {
    await addMonthBtn.click();
  }
  
  const inputKwh = page.locator('input[type="number"]').nth(-2); // Penultimate number input (if the last is total) or just last
  // Let's just grab the last row's kWh and Cost fields. They are usually the 2nd to last and last in a row.
  // A safer way is to just grab the very last ones.
  await page.locator('input[type="number"]').last().fill('7500'); // Cost
  await page.locator('input[type="number"]').nth(-2).fill('1500'); // kWh

  
  await showStepAndWait(page, "ระบบได้จำลองการกรอกข้อมูลค่าไฟ 1,500 หน่วย (7,500 บาท) เรียบร้อยแล้ว สเต็ปถัดไปเราจะไปดูแดชบอร์ดสรุปการใช้ไฟกันครับ");
  
  // Go to Dashboard 
  await page.goto('/analysis/load-data/dashboard');
  await page.waitForTimeout(1000);
  await showStepAndWait(page, "นี่คือแดชบอร์ดสรุปพฤติกรรมการใช้ไฟ (Load Profile) ซึ่งจะนำไปใช้เป็นฐานข้อมูลในการคำนวณโซลาร์เซลล์ต่อไปครับ");
  
  // 3. Go to Solar Analysis Configuration
  await page.goto('/analysis/solar/config');
  await page.waitForTimeout(1000);
  await showStepAndWait(page, "เมื่อมีข้อมูลค่าไฟแล้ว เราจะมาออกแบบโซลาร์เซลล์กันครับ โดยเราสามารถระบุพื้นที่หลังคาที่สามารถติดตั้งได้");
  
  // Type in roof size
  const roofSizeInput = page.getByLabel(/พื้นที่หลังคา/i).or(page.locator('input[name="roofAreaSqm"]'));
  if (await roofSizeInput.isVisible()) {
      await roofSizeInput.fill('50');
  }
  
  await showStepAndWait(page, "ระบบได้ใส่ขนาดพื้นที่หลังคา 50 ตารางเมตร สเต็ปต่อไปจะเป็นการกดปุ่มประมวลผลการลงทุนขั้นสูงครับ");
  
  // Click analyze
  const analyzeBtn = page.getByRole('button', { name: /ประมวลผล|วิเคราะห์/i }).first();
  if (await analyzeBtn.isVisible()) {
    await analyzeBtn.click();
  } else {
    await page.goto('/analysis/solar/results');
  }
  
  // Wait for results to load
  await page.waitForTimeout(2000);
  await showStepAndWait(page, "ผลการวิเคราะห์ออกมาแล้วครับ! ระบบจะคำนวณขนาดติดตั้งที่เหมาะสมที่สุด จุดคุ้มทุน และผลตอบแทน (IRR) ให้โดยอัตโนมัติ");
  
  // 4. Go to Unified Ecosystem Dashboard
  await page.goto('/analysis/ecosystem');
  await page.waitForTimeout(2000);
  await showStepAndWait(page, "และนี่คือ Unified Ecosystem Dashboard ที่สรุปภาพรวมการไหลเวียนของพลังงานทั้งหมดในบ้านของคุณครับ! จบการนำเสนอเพียงเท่านี้ 🎉");
});
