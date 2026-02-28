const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// 🧠 Ultra-Smart Case-Insensitive Search Function
function findKey(obj, keyToFind) {
  if (obj === null || typeof obj !== 'object') return null;

  // 1. Check all keys at the current level, ignoring uppercase/lowercase
  for (let key in obj) {
    if (key.toLowerCase() === keyToFind.toLowerCase() && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }

  // 2. If not found, dig deeper into nested arrays/objects
  for (let key in obj) {
    if (typeof obj[key] === 'object') {
      let result = findKey(obj[key], keyToFind);
      if (result !== null) return result;
    }
  }
  return null;
}

app.get('/api/result/:regNo', async (req, res) => {
    const regNo = req.params.regNo;
    
    try {
        const beuUrl = `https://beu-bih.ac.in/backend/v1/result/get-result?year=2024&rcdg_no=${regNo}&semester=I&exam_held=May%2F2025`;

        const response = await axios.get(beuUrl);
        const beuData = response.data;

        if (!beuData || beuData.length === 0) {
            return res.status(404).json({ success: false, message: "Result not found" });
        }

        // 🎯 Hunt for the data using multiple possible names, completely ignoring case!
        const name = findKey(beuData, 'studentName') || findKey(beuData, 'student_name') || findKey(beuData, 'name') || "Student";
        const sgpa = findKey(beuData, 'sgpa') || findKey(beuData, 'cur_sgpa') || findKey(beuData, 'current_sgpa') || "0.0";
        const cgpa = findKey(beuData, 'cgpa') || findKey(beuData, 'cur_cgpa') || "0.0";
        const status = findKey(beuData, 'result') || findKey(beuData, 'remarks') || findKey(beuData, 'status') || "PASS";

        res.json({
            success: true,
            data: {
                regNo: regNo,
                name: name,
                sgpa: sgpa,
                cgpa: cgpa,
                status: status.toString().toUpperCase().includes('FAIL') ? 'FAIL' : 'PASS',
                remarks: status
            }
        });

    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to connect to BEU Server" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));