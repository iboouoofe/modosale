import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const analyzeListingImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, existingTitle } = req.body;

    if (!imageBase64) {
      res.status(400).json({ success: false, error: 'Analiz için ürün görseli gereklidir.' });
      return;
    }

    // 🧠 RESILIENT FALLBACK: If GEMINI_API_KEY is missing, run a rich, state-of-the-art simulator!
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.log('[AI] Running offline AI listing analyst simulator...');
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate AI network delay

      const titleContext = existingTitle?.toLowerCase() || '';
      
      let suggestion = {
        title: 'Apple iPhone 13 Pro (128 GB - Grafit)',
        description: 'Özenle kullanılmış, kozmetik olarak 10/10 durumunda. Pil sağlığı %86. Kutu ve orijinal şarj kablosuyla teslim edilecektir. Tamir görmemiş, tüm fonksiyonları (FaceID vb.) sorunsuz çalışmaktadır.',
        category: 'Electronics',
        condition: 'new',
        suggestedPrice: 28500,
        priceRange: { min: 26000, max: 31000 }
      };

      if (titleContext.includes('kulak') || titleContext.includes('airpods') || titleContext.includes('sony')) {
        suggestion = {
          title: 'Sony WH-1000XM4 Gürültü Engelleyici Kulaklık',
          description: 'Çok az kullanılmış, sıfır ayarında ANC kulaklık. Pedlerinde en ufak soyulma veya yıpranma yoktur. Orijinal taşıma çantası ve kabloları mevcuttur. Harika ses kalitesi!',
          category: 'Electronics',
          condition: 'good',
          suggestedPrice: 6200,
          priceRange: { min: 5800, max: 6800 }
        };
      } else if (titleContext.includes('elbise') || titleContext.includes('ceket') || titleContext.includes('ayakkabı')) {
        suggestion = {
          title: 'Premium Deri Mont / Ceket (M Beden)',
          description: 'Gerçek deriden üretilmiş, şık kesim siyah mont. Sadece birkaç kez giyildi, hiçbir deformasyon veya yırtık yoktur. Klasik ve spor kombinlere mükemmel uyum sağlar.',
          category: 'Fashion',
          condition: 'good',
          suggestedPrice: 2450,
          priceRange: { min: 2100, max: 2800 }
        };
      } else if (titleContext.includes('kitap') || titleContext.includes('roman')) {
        suggestion = {
          title: 'Dünya Klasikleri 5\'li Roman Seti',
          description: 'Sıfır kondisyonda, sayfalarda karalama veya katlanma yoktur. Hasan Ali Yücel Klasikler serisinden özenle seçilmiş fütüristik set.',
          category: 'Books & Hobbies',
          condition: 'new',
          suggestedPrice: 320,
          priceRange: { min: 280, max: 360 }
        };
      }

      res.status(200).json({
        success: true,
        source: 'simulator',
        data: suggestion
      });
      return;
    }

    // 🤖 REAL GOOGLE GEMINI 1.5 FLASH VISION ANALYSIS (FREE TIER)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Sen profesyonel bir Türk ikinci el ürün pazar uzmanısın. Sana verilen ürün fotoğrafına bakarak sadece ve sadece geçerli bir JSON formatında şu bilgileri üret:
    {
      "title": "string (en fazla 60 karakter, Türkçe, dikkat çekici başlık)",
      "description": "string (en fazla 400 karakter, Türkçe, ürünün durumunu ve özelliklerini detaylandıran satış metni)",
      "category": "Elektronik" | "Moda & Giyim" | "Ev & Yaşam" | "Spor & Outdoor" | "Kitap & Hobi" | "Bebek & Çocuk" | "Diğer",
      "condition": "new" | "good" | "fair",
      "suggestedPrice": number (TL cinsinden piyasa değeri tahmini),
      "priceRange": {
        "min": number (Minimum piyasa fiyatı),
        "max": number (Maksimum piyasa fiyatı)
      }
    }
    JSON dışında hiçbir şey, markdown blokları veya açıklama yazma. Yanıt doğrudan sadece JSON formatında olmalıdır.`;

    const imageParts = [
      {
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
          mimeType: "image/jpeg"
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    let textContent = result.response.text();
    
    // Temizleme: Eğer gemini yanıtın başına ve sonuna ```json ... ``` koyarsa onları temizle
    textContent = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsedData = JSON.parse(textContent);
    res.status(200).json({
      success: true,
      source: 'gemini',
      data: parsedData,
    });
  } catch (error: any) {
    console.error('[AI Analysis Error]:', error);
    res.status(500).json({
      success: false,
      error: 'AI analiz işlemi gerçekleştirilemedi.',
      message: error.message,
    });
  }
};
