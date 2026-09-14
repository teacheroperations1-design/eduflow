/**
 * Camera Helper - يختار الكاميرا الخلفية العادية (مش Wide/Ultra)
 * بيحل مشكلة فتح Wide Lens بدلاً من الكاميرا العادية
 */
window.CameraHelper = {
  _cache: null,
  
  /**
   * جلب الكاميرات المتاحة واختيار الأفضل
   */
  async getPreferredCamera() {
    if (this._cache) return this._cache;
    
    try {
      // 1. لازم نطلب permission الأول عشان الـ labels تظهر
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(t => t.stop());
      
      // 2. جلب كل الكاميرات
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      
      if (!cameras.length) {
        throw new Error('لا توجد كاميرات متاحة');
      }
      
      // 3. ترتيب الكاميرات حسب الأولوية
      const ranked = this._rankCameras(cameras);
      const preferred = ranked[0];
      
      this._cache = preferred;
      return preferred;
      
    } catch (e) {
      console.warn('Camera detection failed, using default:', e);
      // Fallback: استخدم facingMode
      return { deviceId: null, facingMode: 'environment' };
    }
  },
  
  /**
   * ترتيب الكاميرات - الخلفية العادية أولاً، Wide/Ultra آخر حاجة
   */
  _rankCameras(cameras) {
    const wideKeywords = ['wide', 'ultra', '0.5x', 'ultrawide', 'fisheye'];
    const frontKeywords = ['front', 'user', 'face'];
    
    return cameras.map(cam => {
      const label = (cam.label || '').toLowerCase();
      let score = 50; // base score
      
      // كاميرا أمامية = أقل أولوية
      if (frontKeywords.some(k => label.includes(k))) {
        score -= 40;
      }
      
      // Wide/Ultra = أقل أولوية (مش عايزينها)
      if (wideKeywords.some(k => label.includes(k))) {
        score -= 30;
      }
      
      // كاميرا خلفية عادية = أعلى أولوية
      if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
        score += 30;
      }
      
      // كاميرا اسمها "camera 0" غالباً الخلفية العادية على Android
      if (label.includes('camera 0') || label.includes('camera2 0')) {
        score += 20;
      }
      
      // كاميرا اسمها "1" غالباً Wide على iPhone
      if (label.includes('camera 1') || label.includes('back camera 1')) {
        score -= 15;
      }
      
      return { ...cam, score, label };
    }).sort((a, b) => b.score - a.score);
  },
  
  /**
   * فتح الكاميرا (يستخدم الجهاز الأفضل)
   */
  async openCamera(videoElement, options = {}) {
    const preferred = await this.getPreferredCamera();
    
    const constraints = {
      video: preferred.deviceId 
        ? { deviceId: { exact: preferred.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: preferred.facingMode || 'environment' },
      audio: false
    };
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    await videoElement.play();
    
    return stream;
  },
  
  /**
   * جلب قائمة الكاميرات للـ UI (لو عايز المستخدم يختار)
   */
  async listCameras() {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(t => t.stop());
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'videoinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `كاميرا ${i + 1}`,
          isPreferred: i === 0
        }));
    } catch (e) {
      return [];
    }
  },
  
  /**
   * إغلاق الكاميرا
   */
  closeCamera(stream) {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    this._cache = null;
  }
};