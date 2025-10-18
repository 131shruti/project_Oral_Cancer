import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Camera from "./camera";
import axios from "axios";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Avatar,
  Divider,
  IconButton,
  Snackbar,
  Alert,
  Chip,
  Zoom,
  Fade
} from "@mui/material";
import {
  Delete,
  CloudUpload,
  CameraAlt,
  MedicalServices,
  Person,
  Cake,
  InsertPhoto,
  Assessment,
  ZoomIn,
  Close,
  Warning,
  CheckCircle
} from "@mui/icons-material";

const PatientProfile = () => {
  const { patientId } = useParams();
  const [patientData, setPatientData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [openCamera, setOpenCamera] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [zoomedImage, setZoomedImage] = useState(null);

  useEffect(() => {
    const fetchPatientDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:5000/api/patients/${patientId}`);
        setPatientData(response.data);
      } catch (err) {
        setError("Failed to load patient details");
        showSnackbar("Failed to load patient details", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchPatientDetails();
  }, [patientId]);

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleCapture = (imageData) => {
    uploadImage(imageData);
    setOpenCamera(false);
  };

  const uploadImage = async (imageData) => {
    try {
      setIsUploading(true);
      showSnackbar("Uploading image...", "info");
      
      const blob = await fetch(imageData).then(res => res.blob());
      const formData = new FormData();
      formData.append("file", blob);
      formData.append("upload_preset", "ml_default");

      const response = await axios.post(
        `http://localhost:5000/api/patients/${patientId}/add-image`,
        formData
      );

      setPatientData(prev => ({
        ...prev,
        images: [...(prev?.images || []), response.data.imageUrl]
      }));

      showSnackbar("Image uploaded successfully", "success");
    } catch (error) {
      showSnackbar("Image upload failed", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => uploadImage(reader.result);
    reader.readAsDataURL(file);
  };

  const analyzeImages = async () => {
    if (!patientData?.images?.length) {
      showSnackbar("No images to analyze", "warning");
      return;
    }

    try {
      setAnalysisResult({ status: "Analyzing..." });
      showSnackbar("Analyzing images for lesions...", "info");

      const response = await axios.post("http://localhost:8000/predict", {
        imageUrls: patientData.images,
      });

      // Ensure the response has the expected structure
      if (!response.data || !response.data.summary || !response.data.predictions) {
        throw new Error("Invalid response format from server");
      }

      setAnalysisResult({
        ...response.data.summary,
        predictions: response.data.predictions,
        status: "Completed"
      });

      showSnackbar("Analysis completed", "success");
    } catch (error) {
      setAnalysisResult({ error: error.message || "Analysis failed" });
      showSnackbar("Analysis failed", "error");
    }
  };

  const deleteImage = async () => {
    if (!imageToDelete) return;

    try {
      await axios.delete(
        `http://localhost:5000/api/patients/${patientId}/delete-image`,
        { data: { imageUrl: imageToDelete } }
      );

      setPatientData(prev => ({
        ...prev,
        images: prev.images.filter(img => img !== imageToDelete)
      }));

      // Clear any analysis results for this image
      if (analysisResult?.predictions) {
        setAnalysisResult(prev => ({
          ...prev,
          predictions: prev.predictions.filter(p => p.imageUrl !== imageToDelete),
          cancerous_count: prev.predictions.filter(p => 
            p.prediction === "cancerous" && p.imageUrl !== imageToDelete
          ).length
        }));
      }

      setImageToDelete(null);
      showSnackbar("Image deleted", "success");
    } catch (error) {
      showSnackbar("Delete failed", "error");
    }
  };

  const renderLesionOverlay = (lesions, size) => {
    if (!lesions?.length) return null;

    return (
      <Box
        component="svg"
        viewBox={`0 0 ${size.width} ${size.height}`}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        {lesions.map((lesion, idx) => (
          <Fade in={true} timeout={1000} key={idx}>
            <g>
              <polygon
                points={lesion.contour.map(p => `${p[0]},${p[1]}`).join(' ')}
                fill="rgba(255, 0, 0, 0.2)"
                stroke="red"
                strokeWidth="2"
              />
              <circle
                cx={lesion.centroid.x}
                cy={lesion.centroid.y}
                r="3"
                fill="yellow"
              />
              <text
                x={lesion.centroid.x + 5}
                y={lesion.centroid.y - 5}
                fill="white"
                fontSize="10"
                fontWeight="bold"
              >
                {Math.round(lesion.area)}px
              </text>
            </g>
          </Fade>
        ))}
      </Box>
    );
  };

  // Get processed image data for a specific URL
  const getProcessedImage = (imageUrl) => {
    if (!analysisResult?.predictions) return null;
    return analysisResult.predictions.find(p => p.imageUrl === imageUrl);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: "#1976d2", mb: 3 }}>
        <MedicalServices sx={{ verticalAlign: "middle", mr: 1 }} />
        Patient Medical Profile
      </Typography>

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && patientData && (
        <>
          <Card sx={{ mb: 3, boxShadow: 3 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3} display="flex" justifyContent="center">
                  <Avatar
                    sx={{
                      width: 120,
                      height: 120,
                      bgcolor: "#1976d2",
                      fontSize: "3rem",
                    }}
                  >
                    {patientData.name.charAt(0)}
                  </Avatar>
                </Grid>
                <Grid item xs={12} md={9}>
                  <Typography variant="h5" component="div" gutterBottom>
                    {patientData.name}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="body1">
                        <Person sx={{ verticalAlign: "middle", mr: 1 }} />
                        <strong>Patient ID:</strong> {patientId}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="body1">
                        <Cake sx={{ verticalAlign: "middle", mr: 1 }} />
                        <strong>Date of Birth:</strong> {patientData.dob}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body1">
                        <MedicalServices sx={{ verticalAlign: "middle", mr: 1 }} />
                        <strong>Images:</strong> {patientData.images?.length || 0}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
              <InsertPhoto sx={{ mr: 1 }} /> Medical Images
            </Typography>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Button
                    variant="contained"
                    startIcon={<CameraAlt />}
                    onClick={() => setOpenCamera(true)}
                    disabled={isUploading}
                  >
                    Take Photo
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUpload />}
                    disabled={isUploading}
                  >
                    Upload Image
                    <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<Assessment />}
                    onClick={analyzeImages}
                    disabled={!patientData?.images?.length || isUploading}
                    sx={{ minWidth: '180px' }}
                  >
                    {analysisResult?.status === "Analyzing..." ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      "Analyze Images"
                    )}
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {patientData.images?.length > 0 ? (
              <Grid container spacing={2}>
                {patientData.images.map((imageUrl, index) => {
                  const processedImage = getProcessedImage(imageUrl);
                  const isSuspicious = processedImage?.prediction === "cancerous";
                  const displayUrl = processedImage?.processedImage 
                    ? `data:image/jpeg;base64,${processedImage.processedImage}`
                    : imageUrl;

                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                      <Card sx={{ height: "100%", position: "relative" }}>
                        <Box
                          sx={{
                            position: "relative",
                            paddingTop: "100%",
                            overflow: "hidden",
                            cursor: "pointer",
                            "&:hover .zoom-overlay": { opacity: 1 },
                          }}
                          onClick={() => setZoomedImage({
                            imageUrl: displayUrl,
                            prediction: processedImage?.prediction,
                            lesions: processedImage?.lesions,
                            originalSize: processedImage?.originalSize || { width: 224, height: 224 }
                          })}
                        >
                          <img
                            src={displayUrl}
                            alt={`Medical image ${index + 1}`}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          {processedImage?.lesions && renderLesionOverlay(processedImage.lesions, { width: 224, height: 224 })}
                          <Box
                            className="zoom-overlay"
                            sx={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: "rgba(0,0,0,0.3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: 0,
                              transition: "opacity 0.3s",
                            }}
                          >
                            <ZoomIn sx={{ color: "white", fontSize: 40 }} />
                          </Box>
                        </Box>
                        <CardContent sx={{ p: 1 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Chip
                              label={`Image ${index + 1}`}
                              size="small"
                              color={isSuspicious ? "error" : "primary"}
                            />
                            <Box display="flex" alignItems="center">
                              {isSuspicious ? (
                                <>
                                  <Warning color="error" fontSize="small" sx={{ mr: 0.5 }} />
                                  <Typography variant="caption" color="error">
                                    Suspicious
                                  </Typography>
                                </>
                              ) : processedImage && (
                                <>
                                  <CheckCircle color="success" fontSize="small" sx={{ mr: 0.5 }} />
                                  <Typography variant="caption" color="success">
                                    Normal
                                  </Typography>
                                </>
                              )}
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setImageToDelete(imageUrl);
                                }}
                                sx={{ ml: 1 }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                          
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Paper sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body1" color="textSecondary">
                  No medical images available. Please upload or capture images.
                </Typography>
              </Paper>
            )}
          </Box>

          {analysisResult?.recommendation && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                <Assessment sx={{ verticalAlign: "middle", mr: 1 }} />
                Analysis Report
              </Typography>
              <Paper sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Image Analysis</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ width: 150 }}>Total Images Analyzed:</Box>
                      <Box sx={{ fontWeight: 'bold' }}>{analysisResult.totalImages}</Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ width: 150 }}>Suspicious Lesions Found:</Box>
                      <Box sx={{ fontWeight: 'bold', color: 'error.main' }}>
                        {analysisResult.cancerousCount}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ width: 150 }}>Normal Images:</Box>
                      <Box sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {analysisResult.totalImages - analysisResult.cancerousCount}
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      <strong>Clinical Recommendation</strong>
                    </Typography>
                    <Alert
                      severity={analysisResult.recommendation.includes('Treatment') ? 'warning' : 'success'}
                      icon={analysisResult.recommendation.includes('Treatment') ? <Warning /> : <CheckCircle />}
                      sx={{ mb: 1 }}
                    >
                      {analysisResult.recommendation}
                    </Alert>
                    {analysisResult.cancerousCount > 0 && (
                      <Typography variant="body2">
                        Click on images marked with <Warning color="warning" fontSize="small" /> to examine lesions.
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}
        </>
      )}

      {/* Camera Dialog */}
      <Dialog open={openCamera} onClose={() => setOpenCamera(false)} maxWidth="md">
        <DialogTitle>Capture Medical Image</DialogTitle>
        <DialogContent>
          <Camera onCapture={handleCapture} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCamera(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(imageToDelete)} onClose={() => setImageToDelete(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this image?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageToDelete(null)}>Cancel</Button>
          <Button
            onClick={deleteImage}
            color="error"
            variant="contained"
            startIcon={<Delete />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Zoom Dialog */}
      <Dialog
        open={Boolean(zoomedImage)}
        onClose={() => setZoomedImage(null)}
        maxWidth="lg"
        fullWidth
        TransitionComponent={Zoom}
      >
        <DialogTitle sx={{ bgcolor: 'background.paper' }}>
          <Box display="flex" alignItems="center">
            {zoomedImage?.prediction === "cancerous" ? (
              <>
                <Warning color="error" sx={{ mr: 1 }} />
                <Typography variant="h6" color="error">
                  Suspicious Lesions Detected
                </Typography>
              </>
            ) : (
              <>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" color="success">
                  No Suspicious Lesions
                </Typography>
              </>
            )}
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, position: 'relative' }}>
          {zoomedImage && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={zoomedImage.imageUrl}
                alt="Detailed analysis"
                style={{ maxWidth: '100%', maxHeight: '70vh' }}
              />
              {zoomedImage.lesions && renderLesionOverlay(
                zoomedImage.lesions, 
                zoomedImage.originalSize
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'background.paper' }}>
          <Box sx={{ flexGrow: 1 }}>
            {zoomedImage?.lesions?.length > 0 && (
              <Typography variant="body2" sx={{ ml: 2 }}>
                Detected {zoomedImage.lesions.length} lesion(s)
              </Typography>
            )}
          </Box>
          <Button onClick={() => setZoomedImage(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PatientProfile;