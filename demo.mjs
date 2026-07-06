import puppeteer from 'puppeteer';

(async () => {
  console.log('🤖 กำลังเปิดบอทนำทัวร์ (พรีเซนต์โหมด แบบละเอียด)...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null, 
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // ฟังก์ชันแสดงข้อความด้านบน (อยู่ค้างไว้จนกว่าจะโดนแทนที่)
  const showMessage = async (msg) => {
    await page.evaluate((text) => {
      const existingMsg = document.getElementById('bot-msg');
      if (existingMsg) existingMsg.remove();
      
      const div = document.createElement('div');
      div.id = 'bot-msg';
      div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;background:#1e293b;color:#f8fafc;padding:20px 40px;font-size:24px;border-radius:12px;box-shadow: 0 10px 25px rgba(0,0,0,0.5);font-weight:bold;text-align:center;font-family:sans-serif;border-bottom: 4px solid #3b82f6;line-height: 1.4;max-width: 80%;';
      div.innerHTML = '🎯 ' + text;
      document.body.appendChild(div);
    }, msg);
  };
  
  // ฟังก์ชันรอให้คนคลิกปุ่มมุมขวาล่างเพื่อไปต่อ
  const waitForNextStep = async (btnText) => {
    await page.evaluate((text) => {
      return new Promise((resolve) => {
        const btn = document.createElement('button');
        btn.id = 'bot-next-btn';
        btn.innerHTML = `👉 <b>${text}</b><br/><span style="font-size:16px;font-weight:normal">(คลิกเพื่อไปต่อ)</span>`;
        btn.style.cssText = 'position:fixed;bottom:40px;right:40px;z-index:999999;background:#f59e0b;color:white;padding:15px 30px;font-size:22px;border-radius:12px;box-shadow: 0 10px 25px rgba(0,0,0,0.5);cursor:pointer;border:3px solid white;text-align:center;font-family:sans-serif;transition: transform 0.2s;';
        
        btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';
        
        btn.onclick = () => {
          btn.remove();
          resolve();
        };
        document.body.appendChild(btn);
      });
    }, btnText);
  };
  
  // ================= เริ่มการพรีเซนต์ =================
  
  console.log('🌐 ไปที่หน้าแรก...');
  await page.goto('https://thai-energy-planner-web.vercel.app/', { waitUntil: 'networkidle2' });
  
  await showMessage('สวัสดีครับ! ยินดีต้อนรับสู่เว็บแอปพลิเคชัน Thai Energy Planner<br/><span style="font-size:18px;font-weight:normal;color:#94a3b8">ระบบช่วยวางแผนและประเมินความคุ้มค่าด้านพลังงาน (Solar, TOU, Battery)</span>');
  await waitForNextStep('เริ่มการนำเสนอ (หน้าแรก)');
  
  await showMessage('หน้านี้จะเป็น Landing Page เพื่อแนะนำภาพรวมของระบบครับ<br/><span style="font-size:18px;font-weight:normal;color:#94a3b8">เดี๋ยวผมจะพาเลื่อนดูว่าระบบเราสามารถประเมินอะไรได้บ้าง</span>');
  await page.evaluate(() => window.scrollBy({ top: 800, behavior: 'smooth' }));
  await waitForNextStep('เลื่อนไปดูตารางเปรียบเทียบ');
  
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
  await showMessage('นี่คือตัวอย่างเปรียบเทียบสถานการณ์ต่างๆ<br/><span style="font-size:18px;font-weight:normal;color:#94a3b8">เช่น เปลี่ยนมิเตอร์ TOU หรือติดโซลาร์เซลล์ จะช่วยประหยัดได้เท่าไหร่</span>');
  await waitForNextStep('เข้าสู่ระบบของจริง');
  
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await showMessage('ต่อไป ผมจะสาธิตการใช้งานระบบของจริงครับ<br/><span style="font-size:18px;font-weight:normal;color:#94a3b8">โดยเริ่มจากการนำเข้า "ข้อมูลการใช้ไฟฟ้า (Load Data)"</span>');
  await page.goto('https://thai-energy-planner-web.vercel.app/analysis/load-data', { waitUntil: 'networkidle2' });
  await waitForNextStep('เข้าไปหน้ากรอกบิล');
  
  await showMessage('ในหน้านี้ ผู้ใช้สามารถกรอกข้อมูลบิลค่าไฟย้อนหลังได้เลยครับ<br/><span style="font-size:18px;font-weight:normal;color:#94a3b8">เพื่อนำไปสร้าง Load Profile ประจำวันอย่างแม่นยำ</span>');
  await page.goto('https://thai-energy-planner-web.vercel.app/analysis/load-data/bills', { waitUntil: 'networkidle2' });
  await waitForNextStep('ให้บอทสาธิตการพิมพ์');
  
  await showMessage('สมมติว่านี่คือบิลค่าไฟของบ้านพักอาศัยหลังหนึ่งครับ<br/><span style="font-size:18px;font-weight:normal;color:#94a3b8">(บอทกำลังจำลองการกรอกข้อมูลให้ดูอัตโนมัติ)</span>');
  
  await page.click('input[placeholder="เช่น 420"]', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('input[placeholder="เช่น 420"]', '650', { delay: 100 });
  
  await page.click('input[placeholder="เช่น 1810"]', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('input[placeholder="เช่น 1810"]', '3150', { delay: 100 });
  
  await waitForNextStep('เตรียมตัววิเคราะห์ Solar');
  
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
  await showMessage('หลังจากเราได้ข้อมูลการใช้ไฟแล้ว...<br/><span style="font-size:18px;font-weight:normal;color:#94a3b8">ระบบจะสามารถนำไปวิเคราะห์การติดตั้ง Solar Cell ต่อได้ทันทีครับ</span>');
  
  await waitForNextStep('กดปุ่ม "ลอง Solar"');
  
  await showMessage('ระบบกำลังประมวลผลอัลกอริทึมอยู่เบื้องหลังครับ...');
  await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')];
    const solarBtn = links.find(a => a.textContent.includes('ลอง Solar'));
    if (solarBtn) solarBtn.click();
  });
  
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  
  await showMessage('คำนวณเสร็จเรียบร้อย! นี่คือผลลัพธ์การออกแบบระบบโซลาร์เซลล์ครับ<br/><span style="font-size:18px;font-weight:normal;color:#94a3b8">เดี๋ยวเราลองเลื่อนลงไปดูข้อมูลเชิงลึกด้านล่างกันครับ</span>');
  await waitForNextStep('ดูตารางสรุปการเงิน');
  
  await page.evaluate(() => window.scrollBy({ top: 800, behavior: 'smooth' }));
  await showMessage('ส่วนนี้คือหัวใจสำคัญครับ: การวิเคราะห์ความคุ้มค่าทางการเงิน<br/><span style="font-size:18px;font-weight:normal;color:#94a3b8">ระบบจะบอกเลยว่าติดตั้งขนาดกี่กิโลวัตต์ถึงจะดีที่สุด (เช่น คืนทุนใน 3-4 ปี)</span>');
  
  await waitForNextStep('สรุปการนำเสนอ');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  
  await page.evaluate(() => {
      const existingMsg = document.getElementById('bot-msg');
      if (existingMsg) existingMsg.remove();

      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;top:40%;left:50%;transform:translate(-50%, -50%);z-index:99999;background:#10b981;color:white;padding:40px;font-size:32px;border-radius:16px;box-shadow: 0 10px 40px rgba(0,0,0,0.6);font-weight:bold;text-align:center;font-family:sans-serif;border: 4px solid #059669;line-height: 1.5;';
      div.innerHTML = '🎉 จบการสาธิต (Demo) 🎉<br/><br/><span style="font-size:22px;font-weight:normal;">และนี่คือศักยภาพของระบบ Thai Energy Planner ที่ช่วยให้<br/>การประเมินการลงทุนด้านพลังงานเป็นเรื่องง่ายและแม่นยำครับ!</span><br/><br/><span style="font-size:18px;color:#d1fae5;">(ขอบคุณที่รับชมครับ)</span>';
      document.body.appendChild(div);
  });
  
  console.log('✨ บอทนำทัวร์เสร็จสิ้น!');
})();
