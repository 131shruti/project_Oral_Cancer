import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Container,
  Avatar,
  List,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Badge,
  Tabs,
  Tab,
  Pagination,
  Tooltip
} from "@mui/material";
import {
  Person,
  Search,
  Add,
  Cake,
  MedicalServices,
  ArrowForward,
  FilterList,
  MoreVert,
  Emergency,
  Vaccines,
  MonitorHeart
} from "@mui/icons-material";

const PatientList = () => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const navigate = useNavigate();
  const patientsPerPage = 8;

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/patients");
        setPatients(response.data);
        setFilteredPatients(response.data);
      } catch (err) {
        setError("Failed to load patient data. Please try again later.");
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  useEffect(() => {
    let result = patients;
    
    // Apply search filter
  if (search) {
    result = result.filter((patient) =>
      patient.name.toLowerCase().includes(search.toLowerCase())
    );
  }

    
    // Apply tab filter
    if (activeTab === 1) {
      result = result.filter(patient => patient.condition === "Critical");
    } else if (activeTab === 2) {
      result = result.filter(patient => patient.recentVisit);
    }
    
    // Apply sorting
    const sortedPatients = [...result].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredPatients(sortedPatients);
    setPage(1); // Reset to first page when filters change
  }, [search, activeTab, patients, sortConfig]);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const calculateAge = (dob) => {
    if (!dob) return "Unknown";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleChangePage = (event, value) => {
    setPage(value);
  };

  const paginatedPatients = filteredPatients.slice(
    (page - 1) * patientsPerPage,
    page * patientsPerPage
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: "flex", alignItems: "center" }}>
            <MedicalServices sx={{ mr: 2, color: "#1976d2" }} />
            Patient Directory
            <Chip 
              label={`${patients.length} Patients`} 
              color="primary" 
              variant="outlined" 
              sx={{ ml: 2 }} 
            />
          </Typography>
          
          <Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/add-patient')}
              sx={{ minWidth: 150, mr: 2 }}
            >
              New Patient
            </Button>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={handleMenuClick}
            >
              Sort
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => { handleSort("name"); handleMenuClose(); }}>
                Name {sortConfig.key === "name" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </MenuItem>
              <MenuItem onClick={() => { handleSort("dob"); handleMenuClose(); }}>
                Age {sortConfig.key === "dob" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </MenuItem>
              <MenuItem onClick={() => { handleSort("lastVisit"); handleMenuClose(); }}>
                Last Visit {sortConfig.key === "lastVisit" && (sortConfig.direction === "asc" ? "↑" : "↓")}
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="All Patients" icon={<Person />} />
          <Tab label="Critical" icon={<Emergency />} />
          <Tab label="Recent Visits" icon={<MonitorHeart />} />
        </Tabs>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search patients by name, ID, or condition..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={60} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <>
            <List sx={{ width: "100%", bgcolor: "background.paper" }}>
              {paginatedPatients.length > 0 ? (
                paginatedPatients.map((patient) => (
                  <Box key={patient._id}>
                    <ListItemButton
                      onClick={() => navigate(`/patient/${patient._id}`)}
                      sx={{
                        py: 2,
                        "&:hover": {
                          backgroundColor: "rgba(25, 118, 210, 0.08)"
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                          badgeContent={
                            patient.condition === "Critical" ? (
                              <Tooltip title="Critical Condition">
                                <Emergency color="error" fontSize="small" />
                              </Tooltip>
                            ) : patient.recentVisit ? (
                              <Tooltip title="Recent Visit">
                                <MonitorHeart color="success" fontSize="small" />
                              </Tooltip>
                            ) : null
                          }
                        >
                          <Avatar sx={{ bgcolor: "#1976d2" }}>
                            {patient.name.charAt(0)}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="h6" component="div">
                            {patient.name}
                            <Chip
                              label={`${calculateAge(patient.dob)} years`}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                            {patient.medication && (
                              <Tooltip title="Active Medication">
                                <Chip
                                  icon={<Vaccines fontSize="small" />}
                                  label="Medication"
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  sx={{ ml: 1 }}
                                />
                              </Tooltip>
                            )}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              <Cake sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }} />
                              {patient.dob || "Date of birth not specified"}
                              {patient.lastVisit && (
                                <>
                                  <span style={{ margin: "0 8px" }}>•</span>
                                  Last Visit: {new Date(patient.lastVisit).toLocaleDateString()}
                                </>
                              )}
                            </Typography>
                            <Box sx={{ display: "flex", mt: 0.5, gap: 1 }}>
                              {patient.bloodType && (
                                <Chip
                                  label={`Blood: ${patient.bloodType}`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                              {patient.allergies && patient.allergies.length > 0 && (
                                <Chip
                                  label={`Allergies: ${patient.allergies.join(", ")}`}
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </>
                        }
                      />
                      <IconButton edge="end" aria-label="view">
                        <ArrowForward />
                      </IconButton>
                    </ListItemButton>
                    <Divider component="li" />
                  </Box>
                ))
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    {patients.length === 0
                      ? "No patients found in the system"
                      : "No matching patients found"}
                  </Typography>
                  {patients.length === 0 && (
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() => navigate('/add-patient')}
                      sx={{ mt: 2 }}
                    >
                      Add First Patient
                    </Button>
                  )}
                </Box>
              )}
            </List>

            {filteredPatients.length > patientsPerPage && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Pagination
                  count={Math.ceil(filteredPatients.length / patientsPerPage)}
                  page={page}
                  onChange={handleChangePage}
                  color="primary"
                  shape="rounded"
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default PatientList;