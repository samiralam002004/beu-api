const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// 🧠 Smart Case-Insensitive Search Function
function findKey(obj, keyToFind) {
  if (obj === null || typeof obj !== 'object') return null;

  for (let key in obj) {
    if (key.toLowerCase() === keyToFind.toLowerCase() && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }

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
        // ✨ THE PERFECTED API CALL ✨
        // Using axios.get with 'params' ensures the URL is formatted 100% perfectly every time.
        const response = await axios.get('https://beu-bih.ac.in/backend/v1/result/get-result', {
            params: {
                year: '2024',
                redg_no: regNo,       // <-- FIXED: redg_no instead of rcdg_no!
                semester: 'I',
                exam_held: 'May/2025'
            }
        });

        const beuData = response.data;

        // If data is empty or says "No Record Found"
        if (!beuData || beuData.length === 0) {
            return res.status(404).json({ success: false, message: "Result not found" });
        }

        // Extract the exact data you want to send to your Flutter App
        const name = findKey(beuData, 'studentName') || findKey(beuData, 'student_name') || findKey(beuData, 'name') || "Student";
        const sgpa = findKey(beuData, 'sgpa') || findKey(beuData, 'cur_sgpa') || findKey(beuData, 'current_sgpa') || "0.0";
        const cgpa = findKey(beuData, 'cgpa') || findKey(beuData, 'cur_cgpa') || "0.0";
        const status = findKey(beuData, 'result') || findKey(beuData, 'remarks') || findKey(beuData, 'status') || "PASS";

        res.json({
            success: true,
            data: {
                regNo: regNo,
                name: name.toString(),
                sgpa: sgpa.toString(),
                cgpa: cgpa.toString(),
                status: status.toString().toUpperCase().includes('FAIL') ? 'FAIL' : 'PASS',
                remarks: status.toString()
            }
        });

    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to connect to BEU Server" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));