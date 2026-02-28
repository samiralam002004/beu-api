const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// 🧠 Smart Helper Function: This searches deep inside BEU's data to find the exact fields we need
function findKey(obj, keyToFind) {
  if (obj === null || typeof obj !== 'object') return null;
  if (obj.hasOwnProperty(keyToFind)) return obj[keyToFind];
  for (let key in obj) {
    let result = findKey(obj[key], keyToFind);
    if (result) return result;
  }
  return null;
}

app.get('/api/result/:regNo', async (req, res) => {
    const regNo = req.params.regNo;
    
    try {
        // 🚀 THE SECRET API URL YOU FOUND! 
        // Notice how we put the ${regNo} exactly where the Registration Number goes
        const beuUrl = `https://beu-bih.ac.in/backend/v1/result/get-result?year=2024&rcdg_no=${regNo}&semester=I&exam_held=May%2F2025`;

        const response = await axios.get(beuUrl);
        const beuData = response.data;

        // If the university returns nothing, the student doesn't exist
        if (!beuData || beuData.length === 0) {
            return res.status(404).json({ success: false, message: "Result not found" });
        }

        // 🎯 Use our smart function to pluck the exact data out of BEU's system
        const name = findKey(beuData, 'student_name') || findKey(beuData, 'Name') || "Student";
        const sgpa = findKey(beuData, 'sgpa') || findKey(beuData, 'cur_sgpa') || "0.0";
        const cgpa = findKey(beuData, 'cgpa') || findKey(beuData, 'cur_cgpa') || "0.0";
        const status = findKey(beuData, 'result') || findKey(beuData, 'remarks') || "PASS";

        // Send it beautifully formatted back to your Flutter app!
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