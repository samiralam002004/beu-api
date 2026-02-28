const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// 🧠 Smart Case-Insensitive Search Function (Finds SGPA, Name, etc.)
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

// 🕵️ NEW: Smart Subject Extractor
// This hunts down the hidden array containing the student's individual subject marks
function extractSubjects(data) {
    let subjects = [];
    function search(obj) {
        if (Array.isArray(obj)) {
            // Check if this array looks like a list of subjects/marks
            if (obj.length > 0 && typeof obj[0] === 'object') {
                let keys = JSON.stringify(obj[0]).toLowerCase();
                if (keys.includes('ese') || keys.includes('grade') || keys.includes('credit') || keys.includes('sub')) {
                    subjects = obj;
                    return true;
                }
            }
        } else if (obj !== null && typeof obj === 'object') {
            for (let k in obj) {
                if (search(obj[k])) return true;
            }
        }
        return false;
    }
    search(data);
    return subjects;
}

app.get('/api/result/:regNo', async (req, res) => {
    const regNo = req.params.regNo;
    
    try {
        const response = await axios.get('https://beu-bih.ac.in/backend/v1/result/get-result', {
            params: {
                year: '2024',
                redg_no: regNo,
                semester: 'I',
                exam_held: 'May/2025'
            }
        });

        const beuData = response.data;

        if (!beuData || beuData.length === 0) {
            return res.status(404).json({ success: false, message: "Result not found" });
        }

        // 1. Extract Basic Info
        const name = findKey(beuData, 'studentName') || findKey(beuData, 'student_name') || findKey(beuData, 'name') || "Student";
        const sgpa = findKey(beuData, 'sgpa') || findKey(beuData, 'cur_sgpa') || findKey(beuData, 'current_sgpa') || "0.0";
        const cgpa = findKey(beuData, 'cgpa') || findKey(beuData, 'cur_cgpa') || "0.0";
        const status = findKey(beuData, 'result') || findKey(beuData, 'remarks') || findKey(beuData, 'status') || "PASS";
        const college = findKey(beuData, 'collegeName') || findKey(beuData, 'college_name') || findKey(beuData, 'college') || "B. P. MANDAL COLLEGE OF ENGINEERING";

        // 2. Extract and Format Individual Subject Marks
        const rawSubjects = extractSubjects(beuData);
        const formattedSubjects = rawSubjects.map(sub => {
            return [
                (findKey(sub, 'subject_code') || findKey(sub, 'sub_code') || findKey(sub, 'code') || '-').toString(),
                (findKey(sub, 'subject_name') || findKey(sub, 'sub_name') || findKey(sub, 'name') || '-').toString(),
                (findKey(sub, 'ese') || findKey(sub, 'theory_ese') || '-').toString(),
                (findKey(sub, 'ia') || findKey(sub, 'mid_sem') || '-').toString(),
                (findKey(sub, 'total') || findKey(sub, 'tot') || '-').toString(),
                (findKey(sub, 'credit') || findKey(sub, 'cr') || '-').toString(),
                (findKey(sub, 'grade') || findKey(sub, 'gr') || '-').toString()
            ];
        });

        // 3. Send everything safely to the Flutter App
        res.json({
            success: true,
            data: {
                regNo: regNo,
                name: name.toString(),
                sgpa: sgpa.toString(),
                cgpa: cgpa.toString(),
                status: status.toString().toUpperCase().includes('FAIL') ? 'FAIL' : 'PASS',
                remarks: status.toString(),
                college: college.toString(),
                subjects: formattedSubjects // ✨ THIS IS THE NEW DATA!
            }
        });

    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to connect to BEU Server" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));