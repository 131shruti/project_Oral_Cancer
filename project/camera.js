import React, { useRef, useState, useEffect } from "react";
import axios from "axios";

const Camera = ({ onCapture, patientId }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [patientImages, setPatientImages] = useState([]); // Store patient images

  // Fetch available cameras
  useEffect(() => {
    const getDevices = async () => {
      try {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
const videoDevices = mediaDevices.filter((device) => device.kind === "videoinput");

        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error("Error listing devices:", error);
        alert("Could not list camera devices. Please check your browser permissions.");
      }
    };
    getDevices();
  }, []);

  // Fetch images for the patient
  useEffect(() => {
    const fetchPatientImages = async () => {
      try {
        const response = await axios.get(`/api/patients/${patientId}/images`);
        setPatientImages(response.data); // Load stored images
      } catch (error) {
        console.error("Error fetching images:", error);
        alert("Error fetching patient images.");
      }
    };

    if (patientId) {
      fetchPatientImages();
    }
  }, [patientId]);

  // Start Camera with selected device
  const startCamera = async () => {
    try {
      const constraints = selectedDeviceId
        ? { video: { deviceId: { exact: selectedDeviceId } } }
        : { video: true }; // Default to first available camera if no specific device is selected

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOn(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Error accessing camera. Ensure permissions are granted.");
    }
  };

  // Capture Image
  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (canvas && video) {
      canvas.width = 300;
      canvas.height = 200;
      const context = canvas.getContext("2d");

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/png");
      setCapturedImage(imageData);
      onCapture(imageData);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  // Upload to Cloudinary
  const uploadToCloudinary = async () => {
    try {
      const formData = new FormData();
      formData.append("file", capturedImage);
      formData.append("upload_preset", "ml_default"); // Replace with actual preset

      const response = await axios.post(
        "https://api.cloudinary.com/v1_1/dghe99w8q/image/upload", // Replace with your Cloudinary URL
        formData
      );

      const imageUrl = response.data.secure_url;
      console.log("Image uploaded successfully:", imageUrl);

      // Store image URL in MongoDB
      await axios.post("/api/patients/upload-image", {
        patientId,
        imageUrl,
      });

      // Update state with new image
      setPatientImages((prevImages) => [...prevImages, imageUrl]);

      alert("Image uploaded and saved successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Image upload failed. Please try again.");
    }
  };

  return (
    <div>
      <h2>Camera</h2>
      <select
        value={selectedDeviceId || ""}
        onChange={(e) => setSelectedDeviceId(e.target.value)}
      >
        {devices.map((device, index) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${index + 1}`}
          </option>
        ))}
      </select>
      <div>
        <button onClick={startCamera}>Open Camera</button>
        <button onClick={capturePhoto} disabled={!isCameraOn}>
          Capture Photo
        </button>
        <button onClick={stopCamera} disabled={!isCameraOn}>
          Close Camera
        </button>
        <button onClick={uploadToCloudinary} disabled={!capturedImage}>
          Upload
        </button>
      </div>

      {isCameraOn && (
        <div style={{ border: "1px solid blue", marginTop: "10px" }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              backgroundColor: "black",
              height: "auto",
            }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
        </div>
      )}

      {capturedImage && (
        <div>
          <h3>Captured Image:</h3>
          <img
            src={capturedImage}
            alt="Captured"
            style={{ width: "300px", border: "2px solid blue" }}
          />
        </div>
      )}

      {/* Display stored images for this patient */}
      {patientImages.length > 0 && (
        <div>
          <h3>Stored Images for Patient {patientId}:</h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {patientImages.map((img, index) => (
              <img
                key={index}
                src={img}
                alt="Patient's Image"
                style={{ width: "100px", border: "2px solid green" }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Camera;
