import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { HardDrive, ChevronDown, ChevronUp, Search, Copy, Check, Printer, Link, RotateCcw, AlertTriangle, Shield, Info, Play } from 'lucide-react';

/* ============================================================
   CONSTANTS — FILE CATEGORIES
   ============================================================ */

const FILE_CATEGORIES = [
  {
    id: 'documents',
    label: 'Documents & Tabular',
    icon: '\uD83D\uDCC4',
    color: '#3B82F6',
    sensitive: false,
    files: [
      { id: 'word-docs', label: 'Word Documents', tooltip: 'Microsoft Word .docx files', inputType: 'simple', defaultSize: 0.5, unit: 'files' },
      { id: 'excel', label: 'Excel Spreadsheets', tooltip: 'Microsoft Excel .xlsx workbooks', inputType: 'simple', defaultSize: 2, unit: 'files' },
      { id: 'powerpoint', label: 'PowerPoint Presentations', tooltip: 'Microsoft PowerPoint .pptx files', inputType: 'simple', defaultSize: 5, unit: 'files' },
      { id: 'pdf', label: 'PDF Documents', tooltip: 'Portable Document Format files', inputType: 'simple', defaultSize: 1, unit: 'files' },
      { id: 'csv', label: 'CSV Files', tooltip: 'Comma-separated values data files', inputType: 'simple', defaultSize: 0.1, unit: 'files' },
      { id: 'plain-text', label: 'Plain Text Files', tooltip: 'Text (.txt) and log files', inputType: 'simple', defaultSize: 0.01, unit: 'files' },
    ],
  },
  {
    id: 'audio-video',
    label: 'Audio & Video',
    icon: '\uD83C\uDFA5',
    color: '#8B5CF6',
    sensitive: false,
    files: [
      {
        id: 'audio-recordings', label: 'Audio Recordings', tooltip: 'Audio recordings in various formats', inputType: 'format-duration', unit: 'minutes',
        formats: [
          { label: 'WAV 16-bit', sizeMB: 10 },
          { label: 'WAV 24-bit', sizeMB: 15 },
          { label: 'MP3 320k', sizeMB: 2.4 },
          { label: 'FLAC', sizeMB: 5 },
        ],
      },
      {
        id: 'video-recordings', label: 'Video Recordings', tooltip: 'Video files at various resolutions', inputType: 'format-duration', unit: 'minutes',
        formats: [
          { label: '4K', sizeMB: 375 },
          { label: '1080p', sizeMB: 150 },
          { label: '720p', sizeMB: 75 },
          { label: '480p', sizeMB: 30 },
        ],
      },
      {
        id: 'screen-recordings', label: 'Screen Recordings', tooltip: 'Screen capture recordings', inputType: 'format-duration', unit: 'minutes',
        formats: [
          { label: '1080p', sizeMB: 50 },
          { label: '720p', sizeMB: 25 },
        ],
      },
    ],
  },
  {
    id: 'research-imaging',
    label: 'Research Imaging',
    icon: '\uD83D\uDCF7',
    color: '#EC4899',
    sensitive: false,
    files: [
      {
        id: 'research-photos', label: 'Research Photos', tooltip: 'Photographs captured during research', inputType: 'format', unit: 'photos',
        formats: [
          { label: 'JPEG Standard', sizeMB: 5 },
          { label: 'JPEG High-res', sizeMB: 15 },
          { label: 'RAW', sizeMB: 40 },
          { label: 'TIFF', sizeMB: 50 },
        ],
      },
      {
        id: 'microscopy', label: 'Microscopy Images', tooltip: 'Microscopy and histology images', inputType: 'format', unit: 'images',
        formats: [
          { label: 'Standard', sizeMB: 50 },
          { label: 'High-res', sizeMB: 200 },
          { label: 'Z-stack', sizeMB: 500 },
        ],
      },
      {
        id: 'drone-imagery', label: 'Drone / Aerial Imagery', tooltip: 'Aerial photos, LiDAR, and GeoTIFF from drones', inputType: 'format', unit: 'files',
        formats: [
          { label: 'JPEG', sizeMB: 15 },
          { label: 'TIFF / GeoTIFF', sizeMB: 100 },
          { label: 'LiDAR Point Cloud', sizeMB: 500 },
        ],
      },
    ],
  },
  {
    id: 'medical-biosensor',
    label: 'Medical & Biosensor',
    icon: '\uD83C\uDFE5',
    color: '#EF4444',
    sensitive: true,
    files: [
      { id: 'mri-scans', label: 'MRI Scans', tooltip: 'Magnetic resonance imaging scan files', inputType: 'simple', defaultSize: 350, unit: 'scans' },
      { id: 'ct-scans', label: 'CT Scans', tooltip: 'Computed tomography scan files', inputType: 'simple', defaultSize: 200, unit: 'scans' },
      { id: 'dicom', label: 'DICOM Files', tooltip: 'Digital Imaging and Communications in Medicine files', inputType: 'simple', defaultSize: 50, unit: 'files' },
      { id: 'ultrasound', label: 'Ultrasound', tooltip: 'Ultrasound imaging files', inputType: 'simple', defaultSize: 30, unit: 'scans' },
      { id: 'wearable-sensor', label: 'Wearable Sensor Data', tooltip: 'Data from wearable biosensors (per hour of recording)', inputType: 'simple', defaultSize: 0.5, unit: 'hours' },
      { id: 'ecg-holter', label: 'ECG / Holter', tooltip: 'Electrocardiogram and Holter monitor recordings', inputType: 'simple', defaultSize: 100, unit: 'recordings' },
      { id: 'emg', label: 'EMG', tooltip: 'Electromyography recordings', inputType: 'simple', defaultSize: 50, unit: 'recordings' },
      { id: 'whole-slide-pathology', label: 'Whole-Slide Pathology', tooltip: 'Whole-slide digital pathology images', inputType: 'simple', defaultSize: 2000, unit: 'slides' },
    ],
  },
  {
    id: 'geospatial',
    label: 'Geospatial & Environmental',
    icon: '\uD83C\uDF0D',
    color: '#10B981',
    sensitive: false,
    files: [
      { id: 'shapefiles', label: 'Shapefiles', tooltip: 'ESRI shapefile vector data', inputType: 'simple', defaultSize: 10, unit: 'files' },
      { id: 'geotiff-raster', label: 'GeoTIFF Raster', tooltip: 'Georeferenced raster imagery', inputType: 'simple', defaultSize: 100, unit: 'files' },
      { id: 'gps-tracks', label: 'GPS Tracks', tooltip: 'GPS track log files (GPX, KML)', inputType: 'simple', defaultSize: 1, unit: 'files' },
      { id: 'weather-station', label: 'Weather Station Data', tooltip: 'Meteorological station data files', inputType: 'simple', defaultSize: 0.5, unit: 'files' },
      { id: 'satellite-imagery', label: 'Satellite Imagery', tooltip: 'Multispectral and hyperspectral satellite images', inputType: 'simple', defaultSize: 500, unit: 'files' },
      { id: 'lidar-datasets', label: 'LiDAR Datasets', tooltip: 'Terrestrial and airborne LiDAR point clouds', inputType: 'simple', defaultSize: 1000, unit: 'files' },
    ],
  },
  {
    id: 'forestry',
    label: 'Forestry & Natural Resources',
    icon: '\uD83C\uDF32',
    color: '#059669',
    sensitive: false,
    files: [
      { id: 'tree-inventory', label: 'Tree Inventory Plots', tooltip: 'Field inventory plot data', inputType: 'simple', defaultSize: 2, unit: 'files' },
      { id: 'growth-ring', label: 'Growth Ring Data', tooltip: 'Dendrochronology / tree ring measurements', inputType: 'simple', defaultSize: 5, unit: 'files' },
      { id: 'soil-samples', label: 'Soil Samples', tooltip: 'Soil chemistry and texture analysis data', inputType: 'simple', defaultSize: 1, unit: 'files' },
      { id: 'canopy-analysis', label: 'Canopy Analysis', tooltip: 'Canopy cover and structure analysis files', inputType: 'simple', defaultSize: 200, unit: 'files' },
      { id: 'forest-inventory-maps', label: 'Forest Inventory Maps', tooltip: 'Forest resource inventory map layers', inputType: 'simple', defaultSize: 50, unit: 'files' },
    ],
  },
  {
    id: 'chemistry',
    label: 'Chemistry & Spectroscopy',
    icon: '\u2697\uFE0F',
    color: '#F59E0B',
    sensitive: false,
    files: [
      { id: 'nmr-spectra', label: 'NMR Spectra', tooltip: 'Nuclear magnetic resonance spectra', inputType: 'simple', defaultSize: 10, unit: 'files' },
      { id: 'mass-spectrometry', label: 'Mass Spectrometry', tooltip: 'Mass spectrometry data files', inputType: 'simple', defaultSize: 50, unit: 'files' },
      { id: 'ir-raman', label: 'IR / Raman Spectra', tooltip: 'Infrared and Raman spectroscopy data', inputType: 'simple', defaultSize: 5, unit: 'files' },
      { id: 'xrd', label: 'XRD Patterns', tooltip: 'X-ray diffraction pattern files', inputType: 'simple', defaultSize: 2, unit: 'files' },
      { id: 'chromatography', label: 'Chromatography', tooltip: 'HPLC, GC, and other chromatography data', inputType: 'simple', defaultSize: 20, unit: 'files' },
      { id: 'icp-ms', label: 'ICP-MS Data', tooltip: 'Inductively coupled plasma mass spectrometry', inputType: 'simple', defaultSize: 10, unit: 'files' },
    ],
  },
  {
    id: 'archaeology',
    label: 'Archaeology & Paleo-DNA',
    icon: '\uD83E\uDDA4',
    color: '#B45309',
    sensitive: false,
    files: [
      {
        id: 'site-photographs', label: 'Site Photographs', tooltip: 'Archaeological site photography', inputType: 'format', unit: 'photos',
        formats: [
          { label: 'JPEG', sizeMB: 5 },
          { label: 'RAW', sizeMB: 40 },
        ],
      },
      { id: '3d-scans', label: '3D Scans / Photogrammetry', tooltip: '3D laser scans and photogrammetry models', inputType: 'simple', defaultSize: 500, unit: 'files' },
      { id: 'stratigraphic', label: 'Stratigraphic Records', tooltip: 'Stratigraphic profile and layer data', inputType: 'simple', defaultSize: 5, unit: 'files' },
      { id: 'ancient-dna', label: 'Ancient DNA Sequences', tooltip: 'Paleogenomics and ancient DNA sequence files', inputType: 'simple', defaultSize: 1000, unit: 'files' },
      { id: 'artefact-db', label: 'Artefact Databases', tooltip: 'Catalogued artefact records and databases', inputType: 'simple', defaultSize: 10, unit: 'files' },
    ],
  },
  {
    id: 'psychology',
    label: 'Psychology & Cognitive Science',
    icon: '\uD83E\uDDE0',
    color: '#7C3AED',
    sensitive: false,
    files: [
      { id: 'survey-responses', label: 'Survey Responses', tooltip: 'Survey and questionnaire response data', inputType: 'simple', defaultSize: 0.1, unit: 'files' },
      { id: 'interview-transcripts', label: 'Interview Transcripts', tooltip: 'Transcribed interview documents', inputType: 'simple', defaultSize: 0.5, unit: 'files' },
      { id: 'behavioural-coding', label: 'Behavioural Coding', tooltip: 'Coded behavioural observation data', inputType: 'simple', defaultSize: 1, unit: 'files' },
      { id: 'eye-tracking', label: 'Eye-Tracking Data', tooltip: 'Eye movement and gaze tracking data', inputType: 'simple', defaultSize: 50, unit: 'files' },
      { id: 'eeg-psychophysiology', label: 'EEG / Psychophysiology', tooltip: 'Electroencephalography and psychophysiology recordings', inputType: 'simple', defaultSize: 200, unit: 'recordings' },
      { id: 'cognitive-task', label: 'Cognitive Task Data', tooltip: 'Response time and accuracy data from cognitive tasks', inputType: 'simple', defaultSize: 5, unit: 'files' },
      { id: 'questionnaire-data', label: 'Questionnaire Data', tooltip: 'Standardized psychological questionnaire data', inputType: 'simple', defaultSize: 0.2, unit: 'files' },
    ],
  },
  {
    id: 'aquatic-tox',
    label: 'Aquatic & Toxicology',
    icon: '\uD83D\uDC1F',
    color: '#0EA5E9',
    sensitive: false,
    files: [
      { id: 'water-quality', label: 'Water Quality Samples', tooltip: 'Water chemistry and quality measurement data', inputType: 'simple', defaultSize: 0.5, unit: 'files' },
      { id: 'fish-population', label: 'Fish Population Data', tooltip: 'Fish population survey and sampling data', inputType: 'simple', defaultSize: 2, unit: 'files' },
      { id: 'sediment-analysis', label: 'Sediment Analysis', tooltip: 'Sediment chemistry and grain-size analysis', inputType: 'simple', defaultSize: 5, unit: 'files' },
      { id: 'toxicology-assay', label: 'Toxicology Assay Results', tooltip: 'Bioassay and toxicology test results', inputType: 'simple', defaultSize: 1, unit: 'files' },
      { id: 'acoustic-telemetry', label: 'Acoustic Telemetry', tooltip: 'Acoustic tag and receiver telemetry data', inputType: 'simple', defaultSize: 10, unit: 'files' },
    ],
  },
  {
    id: 'driving-transport',
    label: 'Driving & Transportation',
    icon: '\uD83D\uDE97',
    color: '#6366F1',
    sensitive: false,
    files: [
      { id: 'driving-simulator', label: 'Driving Simulator Data', tooltip: 'Driving simulator session output files', inputType: 'simple', defaultSize: 100, unit: 'sessions' },
      {
        id: 'in-vehicle-video', label: 'In-Vehicle Video', tooltip: 'Video recorded inside or outside the vehicle', inputType: 'format-duration', unit: 'minutes',
        formats: [
          { label: '1080p', sizeMB: 150 },
          { label: '720p', sizeMB: 75 },
        ],
      },
      { id: 'can-bus', label: 'CAN Bus Data', tooltip: 'Controller Area Network vehicle bus data (per hour)', inputType: 'simple', defaultSize: 50, unit: 'hours' },
      { id: 'glance-eye-tracking', label: 'Glance / Eye-Tracking', tooltip: 'Driver glance and eye-tracking data', inputType: 'simple', defaultSize: 50, unit: 'files' },
      { id: 'gps-accelerometer', label: 'GPS / Accelerometer', tooltip: 'GPS position and accelerometer sensor data', inputType: 'simple', defaultSize: 10, unit: 'files' },
    ],
  },
  {
    id: 'analysis-software',
    label: 'Analysis Software',
    icon: '\uD83D\uDCBB',
    color: '#14B8A6',
    sensitive: false,
    files: [
      { id: 'spss', label: 'SPSS Files', tooltip: 'IBM SPSS Statistics data and output files', inputType: 'simple', defaultSize: 5, unit: 'files' },
      { id: 'r-projects', label: 'R Projects', tooltip: 'R project folders including data and scripts', inputType: 'simple', defaultSize: 10, unit: 'files' },
      { id: 'python-projects', label: 'Python Projects', tooltip: 'Python project folders and notebooks', inputType: 'simple', defaultSize: 10, unit: 'files' },
      { id: 'matlab-workspaces', label: 'MATLAB Workspaces', tooltip: 'MATLAB .mat workspace and figure files', inputType: 'simple', defaultSize: 50, unit: 'files' },
      { id: 'nvivo', label: 'NVivo Projects', tooltip: 'QSR NVivo qualitative analysis projects', inputType: 'simple', defaultSize: 100, unit: 'files' },
      { id: 'stata', label: 'Stata Files', tooltip: 'Stata .dta data and .do script files', inputType: 'simple', defaultSize: 5, unit: 'files' },
      { id: 'sas', label: 'SAS Files', tooltip: 'SAS datasets and program files', inputType: 'simple', defaultSize: 10, unit: 'files' },
    ],
  },
  {
    id: 'hpc-genomics',
    label: 'HPC & Genomics',
    icon: '\uD83E\uDDEC',
    color: '#D946EF',
    sensitive: false,
    files: [
      {
        id: 'genome-sequences', label: 'Genome Sequences', tooltip: 'Genomic sequencing data files', inputType: 'format', unit: 'samples',
        formats: [
          { label: 'Whole Genome', sizeMB: 100000 },
          { label: 'Exome', sizeMB: 15000 },
          { label: 'RNA-seq', sizeMB: 5000 },
          { label: 'Amplicon', sizeMB: 500 },
        ],
      },
      { id: 'protein-structures', label: 'Protein Structures', tooltip: 'Protein structure PDB and related files', inputType: 'simple', defaultSize: 100, unit: 'files' },
      { id: 'simulation-outputs', label: 'Simulation Outputs', tooltip: 'HPC simulation result files', inputType: 'simple', defaultSize: 1000, unit: 'files' },
      { id: 'hpc-job-logs', label: 'HPC Job Logs', tooltip: 'High-performance computing job log files', inputType: 'simple', defaultSize: 1, unit: 'files' },
    ],
  },
  {
    id: 'education',
    label: 'Education Research',
    icon: '\uD83C\uDF93',
    color: '#F97316',
    sensitive: false,
    files: [
      { id: 'student-assessment', label: 'Student Assessment Data', tooltip: 'Student test scores and assessment data', inputType: 'simple', defaultSize: 0.5, unit: 'files' },
      {
        id: 'classroom-video', label: 'Classroom Video', tooltip: 'Video recordings of classroom sessions', inputType: 'format-duration', unit: 'minutes',
        formats: [
          { label: '1080p', sizeMB: 150 },
          { label: '720p', sizeMB: 75 },
        ],
      },
      { id: 'learning-analytics', label: 'Learning Analytics', tooltip: 'Learning management system analytics exports', inputType: 'simple', defaultSize: 2, unit: 'files' },
      { id: 'curriculum-documents', label: 'Curriculum Documents', tooltip: 'Curriculum plans and instructional design documents', inputType: 'simple', defaultSize: 1, unit: 'files' },
    ],
  },
  {
    id: 'custom',
    label: 'Custom Data Type',
    icon: '\u2699\uFE0F',
    color: '#6B7280',
    sensitive: false,
    files: [
      { id: 'custom-data', label: 'Custom Data', tooltip: 'Enter your own file count and average size', inputType: 'custom', defaultSize: 0, unit: 'files' },
    ],
  },
];

/* ============================================================
   QUICK-START SCENARIOS
   ============================================================ */

const SCENARIOS = [
  {
    id: 'social-science-survey',
    name: 'Social Science Survey',
    icon: '\uD83D\uDCCB',
    description: 'Typical survey-based social science study',
    data: {
      'survey-responses': { count: 500 },
      'excel': { count: 10 },
      'spss': { count: 5 },
      'word-docs': { count: 20 },
      'pdf': { count: 30 },
    },
  },
  {
    id: 'qualitative-interviews',
    name: 'Qualitative Interviews',
    icon: '\uD83C\uDFA4',
    description: 'Interview-based qualitative research',
    data: {
      'audio-recordings': { count: 1, minutes: 1200, format: 'MP3 320k' },
      'interview-transcripts': { count: 40 },
      'nvivo': { count: 1 },
      'word-docs': { count: 15 },
    },
  },
  {
    id: 'clinical-imaging',
    name: 'Clinical Imaging Study',
    icon: '\uD83C\uDFE5',
    description: 'Medical imaging with MRI and CT data',
    data: {
      'mri-scans': { count: 50 },
      'ct-scans': { count: 30 },
      'dicom': { count: 200 },
      'excel': { count: 5 },
      'spss': { count: 3 },
    },
  },
  {
    id: 'ecology-fieldwork',
    name: 'Ecology Fieldwork',
    icon: '\uD83C\uDF3F',
    description: 'Field-based ecological data collection',
    data: {
      'research-photos': { count: 2000, format: 'JPEG Standard' },
      'gps-tracks': { count: 50 },
      'csv': { count: 200 },
      'excel': { count: 20 },
      'water-quality': { count: 100 },
      'r-projects': { count: 5 },
    },
  },
  {
    id: 'genomics-hpc',
    name: 'Genomics & HPC',
    icon: '\uD83E\uDDEC',
    description: 'Large-scale genomic sequencing project',
    data: {
      'genome-sequences': { count: 20, format: 'Whole Genome' },
      'protein-structures': { count: 50 },
      'simulation-outputs': { count: 10 },
      'hpc-job-logs': { count: 500 },
      'python-projects': { count: 3 },
    },
  },
  {
    id: 'psychology-lab',
    name: 'Psychology Lab Study',
    icon: '\uD83E\uDDE0',
    description: 'Cognitive psychology lab experiment',
    data: {
      'cognitive-task': { count: 200 },
      'eye-tracking': { count: 100 },
      'questionnaire-data': { count: 200 },
      'eeg-psychophysiology': { count: 50 },
      'spss': { count: 3 },
      'r-projects': { count: 2 },
    },
  },
  {
    id: 'forestry-inventory',
    name: 'Forestry Inventory',
    icon: '\uD83C\uDF32',
    description: 'Forest resource inventory and analysis',
    data: {
      'tree-inventory': { count: 200 },
      'growth-ring': { count: 100 },
      'soil-samples': { count: 150 },
      'canopy-analysis': { count: 30 },
      'forest-inventory-maps': { count: 20 },
      'drone-imagery': { count: 100, format: 'TIFF / GeoTIFF' },
    },
  },
  {
    id: 'chemistry-lab',
    name: 'Chemistry Lab',
    icon: '\u2697\uFE0F',
    description: 'Analytical chemistry research',
    data: {
      'nmr-spectra': { count: 100 },
      'mass-spectrometry': { count: 50 },
      'ir-raman': { count: 80 },
      'xrd': { count: 40 },
      'chromatography': { count: 60 },
      'excel': { count: 15 },
    },
  },
  {
    id: 'archaeology-dig',
    name: 'Archaeology Dig',
    icon: '\uD83E\uDDA4',
    description: 'Archaeological excavation and analysis',
    data: {
      'site-photographs': { count: 5000, format: 'RAW' },
      '3d-scans': { count: 20 },
      'stratigraphic': { count: 50 },
      'artefact-db': { count: 5 },
      'ancient-dna': { count: 3 },
    },
  },
  {
    id: 'driving-research',
    name: 'Driving Research',
    icon: '\uD83D\uDE97',
    description: 'Driving behaviour and simulator study',
    data: {
      'driving-simulator': { count: 60 },
      'in-vehicle-video': { count: 1, minutes: 3000, format: '1080p' },
      'can-bus': { count: 60 },
      'glance-eye-tracking': { count: 60 },
      'gps-accelerometer': { count: 60 },
    },
  },
  {
    id: 'aquatic-study',
    name: 'Aquatic Study',
    icon: '\uD83D\uDC1F',
    description: 'Freshwater aquatic ecology research',
    data: {
      'water-quality': { count: 500 },
      'fish-population': { count: 100 },
      'sediment-analysis': { count: 50 },
      'acoustic-telemetry': { count: 30 },
      'csv': { count: 100 },
      'r-projects': { count: 3 },
    },
  },
  {
    id: 'education-classroom',
    name: 'Education Classroom',
    icon: '\uD83C\uDF93',
    description: 'Classroom-based education research',
    data: {
      'student-assessment': { count: 300 },
      'classroom-video': { count: 1, minutes: 6000, format: '720p' },
      'learning-analytics': { count: 50 },
      'curriculum-documents': { count: 20 },
      'survey-responses': { count: 150 },
    },
  },
  {
    id: 'geospatial-remote-sensing',
    name: 'Remote Sensing',
    icon: '\uD83C\uDF0D',
    description: 'Satellite and geospatial data analysis',
    data: {
      'satellite-imagery': { count: 50 },
      'geotiff-raster': { count: 100 },
      'shapefiles': { count: 40 },
      'lidar-datasets': { count: 10 },
      'python-projects': { count: 3 },
    },
  },
  {
    id: 'biosensor-wearable',
    name: 'Wearable Biosensor',
    icon: '\u231A',
    description: 'Wearable device health monitoring study',
    data: {
      'wearable-sensor': { count: 5000 },
      'ecg-holter': { count: 100 },
      'csv': { count: 500 },
      'python-projects': { count: 2 },
      'excel': { count: 10 },
    },
  },
  {
    id: 'mixed-methods',
    name: 'Mixed Methods',
    icon: '\uD83D\uDD00',
    description: 'Combined qualitative and quantitative study',
    data: {
      'survey-responses': { count: 300 },
      'audio-recordings': { count: 1, minutes: 600, format: 'MP3 320k' },
      'interview-transcripts': { count: 20 },
      'excel': { count: 15 },
      'spss': { count: 3 },
      'nvivo': { count: 1 },
      'word-docs': { count: 25 },
    },
  },
];

/* ============================================================
   WHAT-IF TEMPLATES
   ============================================================ */

const WHAT_IF_TEMPLATES = [
  { name: 'Lossless to Lossy Audio', desc: 'Convert WAV to MP3', applies: ['audio-recordings'], type: 'reduction', factor: 0.24 },
  { name: 'Downsample Video to 720p', desc: 'Reduce video resolution from 1080p/4K to 720p', applies: ['video-recordings', 'screen-recordings', 'in-vehicle-video', 'classroom-video'], type: 'reduction', factor: 0.5 },
  { name: 'JPEG Instead of RAW', desc: 'Use JPEG compression instead of RAW/TIFF', applies: ['research-photos', 'site-photographs'], type: 'reduction', factor: 0.125 },
  { name: 'Standard Microscopy', desc: 'Use standard resolution instead of high-res/z-stack', applies: ['microscopy'], type: 'reduction', factor: 0.25 },
  { name: 'Amplicon Instead of WGS', desc: 'Use targeted amplicon sequencing instead of whole genome', applies: ['genome-sequences'], type: 'reduction', factor: 0.005 },
  { name: '2x Data Growth', desc: 'What if your dataset doubles in size?', applies: 'all', type: 'increase', factor: 2 },
  { name: '5x Data Growth', desc: 'What if your dataset grows 5 times?', applies: 'all', type: 'increase', factor: 5 },
];

/* ============================================================
   FORMAT RECOMMENDATIONS
   ============================================================ */

const FORMAT_RECOMMENDATIONS = {
  'audio-recordings': { current: 'WAV (uncompressed)', recommended: 'FLAC or MP3', savings: '50-75%', note: 'FLAC is lossless; MP3 is lossy but much smaller.' },
  'video-recordings': { current: '4K / Uncompressed', recommended: '1080p H.264/H.265', savings: '60-80%', note: 'H.265 offers better compression than H.264.' },
  'research-photos': { current: 'RAW / TIFF', recommended: 'JPEG High-res (archival)', savings: '60-90%', note: 'Keep RAW for active analysis; archive as JPEG.' },
  'microscopy': { current: 'High-res / Z-stack', recommended: 'Standard resolution', savings: '75-90%', note: 'Downsample completed analyses; keep originals as needed.' },
  'genome-sequences': { current: 'Whole Genome FASTQ', recommended: 'Compressed BAM/CRAM', savings: '30-60%', note: 'CRAM format offers best compression for aligned reads.' },
  'site-photographs': { current: 'RAW', recommended: 'JPEG High-quality', savings: '85%', note: 'Archive RAW originals; work with JPEG copies.' },
  'drone-imagery': { current: 'TIFF / GeoTIFF', recommended: 'Cloud-Optimized GeoTIFF (COG)', savings: '20-40%', note: 'COGs allow efficient partial reads.' },
};

/* ============================================================
   DATA CLASSIFICATION TRIGGERS
   ============================================================ */

const CLASSIFICATION_TRIGGERS = {
  highly_confidential: ['mri-scans', 'ct-scans', 'dicom', 'ultrasound', 'wearable-sensor', 'ecg-holter', 'emg', 'whole-slide-pathology', 'ancient-dna'],
  confidential: ['eeg-psychophysiology', 'eye-tracking', 'student-assessment', 'glance-eye-tracking', 'toxicology-assay'],
  internal: ['survey-responses', 'interview-transcripts', 'questionnaire-data', 'behavioural-coding', 'cognitive-task', 'driving-simulator', 'learning-analytics', 'fish-population'],
  public: ['csv', 'plain-text', 'shapefiles', 'gps-tracks', 'weather-station', 'hpc-job-logs'],
};

/* ============================================================
   BACKUP STRATEGIES
   ============================================================ */

const BACKUP_STRATEGIES = [
  { id: 'none', label: 'No Backup', icon: '\u274C', multiplier: 1, desc: 'Single copy only (not recommended)' },
  { id: '3-2-1', label: '3-2-1 Rule', icon: '\u2705', multiplier: 3, desc: '3 copies, 2 media types, 1 offsite' },
  { id: '3-2-1-1', label: '3-2-1-1 Rule', icon: '\uD83D\uDD12', multiplier: 4, desc: '3-2-1 plus 1 air-gapped or immutable copy' },
  { id: 'custom', label: 'Custom', icon: '\u2699\uFE0F', multiplier: null, desc: 'Set your own multiplier' },
];

/* ============================================================
   HELPERS
   ============================================================ */

function formatSize(gb) {
  if (gb < 0.01) return '0 GB';
  if (gb < 1) return `${(gb * 1024).toFixed(0)} MB`;
  if (gb < 1024) return `${gb.toFixed(1)} GB`;
  return `${(gb / 1024).toFixed(2)} TB`;
}

function findFileById(fileId) {
  for (const cat of FILE_CATEGORIES) {
    for (const file of cat.files) {
      if (file.id === fileId) return { file, category: cat };
    }
  }
  return null;
}

/* ============================================================
   SUB-COMPONENT — DOUGHNUT CHART
   ============================================================ */

function DoughnutChart({ contributions, totalLabel }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 160;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const outerR = 70;
    const innerR = 42;
    const total = contributions.reduce((s, c) => s + c.value, 0);

    ctx.clearRect(0, 0, size, size);

    if (total === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(148,163,184,0.15)';
      ctx.fill();
    } else {
      let startAngle = -Math.PI / 2;
      for (const c of contributions) {
        if (c.value <= 0) continue;
        const sweep = (c.value / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, startAngle, startAngle + sweep);
        ctx.arc(cx, cy, innerR, startAngle + sweep, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = c.color;
        ctx.fill();
        startAngle += sweep;
      }
    }

    // Center text
    ctx.fillStyle = 'var(--text-primary, #e2e8f0)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(totalLabel, cx, cy - 6);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Total Active', cx, cy + 10);
  }, [contributions, totalLabel]);

  return (
    <div className="sc-chart-wrapper">
      <canvas ref={canvasRef} className="sc-chart-canvas" />
      <div className="sc-chart-legend">
        {contributions.filter(c => c.value > 0).map(c => (
          <div key={c.label} className="sc-legend-item">
            <span className="sc-legend-swatch" style={{ background: c.color }} />
            <span className="sc-legend-label">{c.label}</span>
            <span className="sc-legend-value">{formatSize(c.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function StorageCalculator() {
  // --- State ---
  const [inputs, setInputs] = useState({});
  const [fileSizes, setFileSizes] = useState({});
  const [formatSelections, setFormatSelections] = useState({});
  const [durations, setDurations] = useState({});
  const [multiplier, setMultiplier] = useState(3);
  const [activeDuration, setActiveDuration] = useState(3);
  const [archivalDuration, setArchivalDuration] = useState(7);
  const [indigenousData, setIndigenousData] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [customCount, setCustomCount] = useState(0);
  const [customSize, setCustomSize] = useState(0);
  const [copied, setCopied] = useState(false);
  const [scenariosExpanded, setScenariosExpanded] = useState(false);
  const [customMultiplier, setCustomMultiplier] = useState(3);
  const [selectedBackup, setSelectedBackup] = useState('3-2-1');

  // --- Load from URL on mount ---
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const config = params.get('config');
      if (config) {
        const decoded = JSON.parse(atob(config));
        if (decoded.inputs) setInputs(decoded.inputs);
        if (decoded.fileSizes) setFileSizes(decoded.fileSizes);
        if (decoded.formatSelections) setFormatSelections(decoded.formatSelections);
        if (decoded.durations) setDurations(decoded.durations);
        if (decoded.multiplier !== undefined) setMultiplier(decoded.multiplier);
        if (decoded.activeDuration !== undefined) setActiveDuration(decoded.activeDuration);
        if (decoded.archivalDuration !== undefined) setArchivalDuration(decoded.archivalDuration);
        if (decoded.indigenousData !== undefined) setIndigenousData(decoded.indigenousData);
        if (decoded.customCount !== undefined) setCustomCount(decoded.customCount);
        if (decoded.customSize !== undefined) setCustomSize(decoded.customSize);
        // Expand categories that have inputs
        const cats = new Set();
        for (const fileId of Object.keys(decoded.inputs || {})) {
          const found = findFileById(fileId);
          if (found) cats.add(found.category.id);
        }
        setExpandedCategories(cats);
      }
    } catch {
      // Ignore invalid config
    }
  }, []);

  // --- Toggle category ---
  const toggleCategory = useCallback((catId) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  // --- Input handlers ---
  const handleInputChange = useCallback((fileId, value) => {
    const num = Math.max(0, parseInt(value) || 0);
    setInputs(prev => ({ ...prev, [fileId]: num }));
  }, []);

  const handleFormatSelect = useCallback((fileId, formatLabel) => {
    setFormatSelections(prev => ({ ...prev, [fileId]: formatLabel }));
  }, []);

  const handleDurationChange = useCallback((fileId, value) => {
    const num = Math.max(0, parseFloat(value) || 0);
    setDurations(prev => ({ ...prev, [fileId]: num }));
  }, []);

  const handleFileSizeChange = useCallback((fileId, value) => {
    const num = Math.max(0, parseFloat(value) || 0);
    setFileSizes(prev => ({ ...prev, [fileId]: num }));
  }, []);

  // --- Apply scenario ---
  const applyScenario = useCallback((scenario) => {
    // Reset all inputs
    const newInputs = {};
    const newFormats = {};
    const newDurations = {};
    const catsToExpand = new Set();

    for (const [fileId, data] of Object.entries(scenario.data)) {
      newInputs[fileId] = data.count;
      if (data.format) newFormats[fileId] = data.format;
      if (data.minutes) newDurations[fileId] = data.minutes;
      const found = findFileById(fileId);
      if (found) catsToExpand.add(found.category.id);
    }

    setInputs(newInputs);
    setFormatSelections(newFormats);
    setDurations(newDurations);
    setFileSizes({});
    setCustomCount(0);
    setCustomSize(0);
    setExpandedCategories(catsToExpand);
    setActiveScenario(scenario.id);
  }, []);

  // --- Reset all ---
  const resetAll = useCallback(() => {
    setInputs({});
    setFileSizes({});
    setFormatSelections({});
    setDurations({});
    setMultiplier(3);
    setActiveDuration(3);
    setArchivalDuration(7);
    setIndigenousData(false);
    setActiveScenario(null);
    setSearchQuery('');
    setExpandedCategories(new Set());
    setCustomCount(0);
    setCustomSize(0);
    setCopied(false);
    setSelectedBackup('3-2-1');
    setCustomMultiplier(3);
  }, []);

  // --- Core calculation ---
  const { contributions, totalBaseMB, totalActiveGB, totalArchivalGB, activeFileTypes, classificationLevel, classificationRequirements } = useMemo(() => {
    const contribs = [];
    let totalBase = 0;
    const activeTypes = new Set();

    for (const cat of FILE_CATEGORIES) {
      let catMB = 0;
      for (const file of cat.files) {
        const count = file.id === 'custom-data' ? customCount : (inputs[file.id] || 0);
        if (count <= 0) continue;

        activeTypes.add(file.id);
        let sizeMB = 0;

        if (file.inputType === 'custom') {
          sizeMB = count * customSize;
        } else if (file.inputType === 'simple') {
          const perFile = fileSizes[file.id] !== undefined ? fileSizes[file.id] : file.defaultSize;
          sizeMB = count * perFile;
        } else if (file.inputType === 'format') {
          const selectedFormat = formatSelections[file.id] || (file.formats[0]?.label);
          const fmt = file.formats.find(f => f.label === selectedFormat) || file.formats[0];
          sizeMB = count * (fmt ? fmt.sizeMB : file.defaultSize || 0);
        } else if (file.inputType === 'format-duration') {
          const selectedFormat = formatSelections[file.id] || (file.formats[0]?.label);
          const fmt = file.formats.find(f => f.label === selectedFormat) || file.formats[0];
          const mins = durations[file.id] || 0;
          sizeMB = count * mins * (fmt ? fmt.sizeMB : 0);
        }

        catMB += sizeMB;
      }

      if (catMB > 0) {
        contribs.push({ label: cat.label, value: catMB / 1024, color: cat.color });
      }
      totalBase += catMB;
    }

    const baseGB = totalBase / 1024;
    const activeGB = baseGB * multiplier;
    const archivalGB = baseGB * 2;

    // Classification
    let level = 'Public';
    let reqs = [];

    const activeArr = Array.from(activeTypes);
    const hasHighlyConf = activeArr.some(id => CLASSIFICATION_TRIGGERS.highly_confidential.includes(id));
    const hasConf = activeArr.some(id => CLASSIFICATION_TRIGGERS.confidential.includes(id));
    const hasInternal = activeArr.some(id => CLASSIFICATION_TRIGGERS.internal.includes(id));

    if (hasHighlyConf) {
      level = 'Highly Confidential';
      reqs = [
        'Encrypted storage required',
        'Access restricted to authorized personnel only',
        'Audit logging mandatory',
        'Ethics board approval required',
        'Data sharing agreement needed for any transfer',
      ];
    } else if (hasConf) {
      level = 'Confidential';
      reqs = [
        'Encrypted storage recommended',
        'Access controlled by PI',
        'Regular access review required',
      ];
    } else if (hasInternal) {
      level = 'Internal';
      reqs = [
        'University-provided storage systems',
        'Standard access controls',
      ];
    } else {
      reqs = ['No special requirements'];
    }

    // Check for sensitive categories
    const hasSensitiveCat = FILE_CATEGORIES.some(cat =>
      cat.sensitive && cat.files.some(f => activeTypes.has(f.id))
    );
    if (hasSensitiveCat && level !== 'Highly Confidential') {
      level = 'Highly Confidential';
      reqs = [
        'Encrypted storage required',
        'Access restricted to authorized personnel only',
        'Audit logging mandatory',
        'Ethics board approval required',
        'Data sharing agreement needed for any transfer',
      ];
    }

    if (indigenousData) {
      reqs.push('OCAP\u00AE principles apply (Ownership, Control, Access, Possession)');
      reqs.push('Consult with Indigenous communities before data collection');
    }

    return {
      contributions: contribs,
      totalBaseMB: totalBase,
      totalActiveGB: activeGB,
      totalArchivalGB: archivalGB,
      activeFileTypes: activeTypes,
      classificationLevel: level,
      classificationRequirements: reqs,
    };
  }, [inputs, fileSizes, formatSelections, durations, multiplier, customCount, customSize, indigenousData]);

  // --- Warnings ---
  const warnings = useMemo(() => {
    const w = [];
    const activeGB = totalActiveGB;
    if (activeGB >= 102400) {
      w.push({ level: 'critical', text: `Your estimated active storage exceeds 100 TB (${formatSize(activeGB)}). Contact RDM services to discuss HPC and institutional storage options.` });
    } else if (activeGB >= 1024) {
      w.push({ level: 'warning', text: `Your estimated active storage exceeds 1 TB (${formatSize(activeGB)}). Consider tiered storage strategies and data compression.` });
    } else if (activeGB >= 100) {
      w.push({ level: 'info', text: `Your estimated active storage is ${formatSize(activeGB)}. Ensure your storage plan accounts for growth.` });
    }
    if (indigenousData) {
      w.push({ level: 'warning', text: 'Indigenous data governance: OCAP\u00AE principles require community engagement before and during data management planning.' });
    }
    return w;
  }, [totalActiveGB, indigenousData]);

  // --- What-if scenarios ---
  const activeWhatIfs = useMemo(() => {
    return WHAT_IF_TEMPLATES.filter(t => {
      if (t.applies === 'all') return activeFileTypes.size > 0;
      return t.applies.some(id => activeFileTypes.has(id));
    });
  }, [activeFileTypes]);

  // --- Active format recommendations ---
  const activeRecommendations = useMemo(() => {
    const recs = [];
    for (const [fileId, rec] of Object.entries(FORMAT_RECOMMENDATIONS)) {
      if (activeFileTypes.has(fileId)) {
        recs.push({ fileId, ...rec });
      }
    }
    return recs;
  }, [activeFileTypes]);

  // --- Filtered categories ---
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return FILE_CATEGORIES;
    const q = searchQuery.toLowerCase();
    return FILE_CATEGORIES.map(cat => {
      const matchedFiles = cat.files.filter(
        f => f.label.toLowerCase().includes(q) || f.tooltip.toLowerCase().includes(q)
      );
      const catMatch = cat.label.toLowerCase().includes(q);
      if (catMatch) return cat;
      if (matchedFiles.length > 0) return { ...cat, files: matchedFiles };
      return null;
    }).filter(Boolean);
  }, [searchQuery]);

  // --- Export: DMP Text ---
  const generateDMPText = useCallback(async () => {
    const date = new Date().toLocaleDateString('en-CA');
    let text = `# Research Data Storage Plan\n`;
    text += `Generated: ${date}\n\n`;
    text += `## Storage Summary\n`;
    text += `- Base Data Size: ${formatSize(totalBaseMB / 1024)}\n`;
    text += `- Active Storage (${multiplier}x backup): ${formatSize(totalActiveGB)}\n`;
    text += `- Archival Storage: ${formatSize(totalArchivalGB)}\n`;
    text += `- Active Duration: ${activeDuration} years\n`;
    text += `- Archival Duration: ${archivalDuration} years\n`;
    text += `  (LUFA Collective Agreement mandates minimum 7-year retention after research completion)\n\n`;
    text += `## Data Classification: ${classificationLevel}\n`;
    classificationRequirements.forEach(r => { text += `- ${r}\n`; });
    text += `\n## Data Types\n`;

    for (const cat of FILE_CATEGORIES) {
      const activeFiles = cat.files.filter(f => {
        if (f.id === 'custom-data') return customCount > 0;
        return (inputs[f.id] || 0) > 0;
      });
      if (activeFiles.length === 0) continue;
      text += `\n### ${cat.icon} ${cat.label}\n`;
      for (const file of activeFiles) {
        const count = file.id === 'custom-data' ? customCount : inputs[file.id];
        text += `- ${file.label}: ${count} ${file.unit}`;
        if (file.inputType === 'format' || file.inputType === 'format-duration') {
          text += ` (${formatSelections[file.id] || file.formats[0]?.label})`;
        }
        if (file.inputType === 'format-duration' && durations[file.id]) {
          text += ` x ${durations[file.id]} min`;
        }
        text += `\n`;
      }
    }

    if (warnings.length > 0) {
      text += `\n## Warnings\n`;
      warnings.forEach(w => { text += `- ${w.text}\n`; });
    }

    text += `\n---\nGenerated by RDM Toolkit \u2014 Lakehead University\n`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [totalBaseMB, totalActiveGB, totalArchivalGB, multiplier, activeDuration, archivalDuration, classificationLevel, classificationRequirements, inputs, formatSelections, durations, customCount, warnings]);

  // --- Export: Print ---
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // --- Export: Consultation Email ---
  const generateConsultationEmail = useCallback(() => {
    const subject = encodeURIComponent('Research Data Storage Consultation Request');
    const body = encodeURIComponent(
      `Dear RDM Team,\n\nI would like to request a consultation regarding my research data storage needs.\n\n` +
      `Estimated Active Storage: ${formatSize(totalActiveGB)}\n` +
      `Estimated Archival Storage: ${formatSize(totalArchivalGB)}\n` +
      `Data Classification: ${classificationLevel}\n` +
      `Active Duration: ${activeDuration} years\n` +
      `Archival Duration: ${archivalDuration} years\n\n` +
      `Please let me know available times for a meeting.\n\nThank you.`
    );
    window.open(`mailto:rdm@lakeheadu.ca?subject=${subject}&body=${body}`);
  }, [totalActiveGB, totalArchivalGB, classificationLevel, activeDuration, archivalDuration]);

  // --- Export: Save Configuration ---
  const saveConfiguration = useCallback(async () => {
    const config = {
      inputs,
      fileSizes,
      formatSelections,
      durations,
      multiplier,
      activeDuration,
      archivalDuration,
      indigenousData,
      customCount,
      customSize,
    };
    const encoded = btoa(JSON.stringify(config));
    const url = `${window.location.origin}${window.location.pathname}?config=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [inputs, fileSizes, formatSelections, durations, multiplier, activeDuration, archivalDuration, indigenousData, customCount, customSize]);

  // --- Render file input row ---
  const renderFileInput = (file, cat) => {
    if (file.inputType === 'custom') {
      return (
        <div key={file.id} className="sc-file-row">
          <div className="sc-file-info">
            <label className="sc-file-label">{file.label}</label>
            <span className="sc-file-tooltip">{file.tooltip}</span>
          </div>
          <div className="sc-file-inputs">
            <div className="sc-input-group">
              <label className="sc-input-label">Count</label>
              <input
                type="number"
                className="sc-input"
                min="0"
                value={customCount || ''}
                onChange={e => setCustomCount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
              />
            </div>
            <div className="sc-input-group">
              <label className="sc-input-label">Size (MB each)</label>
              <input
                type="number"
                className="sc-input"
                min="0"
                step="0.1"
                value={customSize || ''}
                onChange={e => setCustomSize(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0"
              />
            </div>
          </div>
        </div>
      );
    }

    if (file.inputType === 'format-duration') {
      const selectedFormat = formatSelections[file.id] || file.formats[0]?.label;
      return (
        <div key={file.id} className="sc-file-row">
          <div className="sc-file-info">
            <label className="sc-file-label">{file.label}</label>
            <span className="sc-file-tooltip">{file.tooltip}</span>
          </div>
          <div className="sc-file-inputs">
            <div className="sc-input-group">
              <label className="sc-input-label">Count</label>
              <input
                type="number"
                className="sc-input"
                min="0"
                value={inputs[file.id] || ''}
                onChange={e => handleInputChange(file.id, e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="sc-input-group">
              <label className="sc-input-label">Format</label>
              <select
                className="sc-select"
                value={selectedFormat}
                onChange={e => handleFormatSelect(file.id, e.target.value)}
              >
                {file.formats.map(f => (
                  <option key={f.label} value={f.label}>{f.label} ({f.sizeMB} MB/min)</option>
                ))}
              </select>
            </div>
            <div className="sc-input-group">
              <label className="sc-input-label">Minutes</label>
              <input
                type="number"
                className="sc-input"
                min="0"
                value={durations[file.id] || ''}
                onChange={e => handleDurationChange(file.id, e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>
      );
    }

    if (file.inputType === 'format') {
      const selectedFormat = formatSelections[file.id] || file.formats[0]?.label;
      return (
        <div key={file.id} className="sc-file-row">
          <div className="sc-file-info">
            <label className="sc-file-label">{file.label}</label>
            <span className="sc-file-tooltip">{file.tooltip}</span>
          </div>
          <div className="sc-file-inputs">
            <div className="sc-input-group">
              <label className="sc-input-label">Count ({file.unit})</label>
              <input
                type="number"
                className="sc-input"
                min="0"
                value={inputs[file.id] || ''}
                onChange={e => handleInputChange(file.id, e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="sc-input-group">
              <label className="sc-input-label">Format</label>
              <select
                className="sc-select"
                value={selectedFormat}
                onChange={e => handleFormatSelect(file.id, e.target.value)}
              >
                {file.formats.map(f => (
                  <option key={f.label} value={f.label}>{f.label} ({f.sizeMB} MB)</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      );
    }

    // simple
    return (
      <div key={file.id} className="sc-file-row">
        <div className="sc-file-info">
          <label className="sc-file-label">{file.label}</label>
          <span className="sc-file-tooltip">{file.tooltip}</span>
        </div>
        <div className="sc-file-inputs">
          <div className="sc-input-group">
            <label className="sc-input-label">Count ({file.unit})</label>
            <input
              type="number"
              className="sc-input"
              min="0"
              value={inputs[file.id] || ''}
              onChange={e => handleInputChange(file.id, e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="sc-input-group">
            <label className="sc-input-label">Size (MB each)</label>
            <input
              type="number"
              className="sc-input sc-input--size"
              min="0"
              step="0.1"
              value={fileSizes[file.id] !== undefined ? fileSizes[file.id] : file.defaultSize}
              onChange={e => handleFileSizeChange(file.id, e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  };

  // --- Classification badge color ---
  const classColor = classificationLevel === 'Highly Confidential' ? '#EF4444'
    : classificationLevel === 'Confidential' ? '#F59E0B'
    : classificationLevel === 'Internal' ? '#3B82F6'
    : '#10B981';

  /* ============================================================
     RENDER
     ============================================================ */

  const hasAnyData = activeFileTypes.size > 0;

  return (
    <div className="htw sc-page">
      <div className="sc-layout">
        {/* ---- LEFT COLUMN ---- */}
        <div className="sc-left">
          {/* Compact Header */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <HardDrive size={22} />
              Research Storage Calculator
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Estimate how much storage your research project needs.
            </p>
          </div>

          {/* Getting Started prompt — only shown when no data entered */}
          {!hasAnyData && !scenariosExpanded && (
            <div className="sc-getting-started">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                <strong>How to start:</strong> Choose a quick-start scenario below, or expand a data category to enter your file counts manually.
              </p>
              <button
                className="sc-getting-started-btn"
                onClick={() => setScenariosExpanded(true)}
                type="button"
              >
                <Play size={16} /> Browse Quick-Start Scenarios
              </button>
            </div>
          )}

          {/* Quick-Start Scenarios — collapsible */}
          {(scenariosExpanded || hasAnyData) && (
            <section className="sc-section">
              <button
                className="sc-section-header"
                onClick={() => setScenariosExpanded(!scenariosExpanded)}
                type="button"
              >
                <h2 className="sc-section-title">
                  <Play size={16} /> Quick-Start Scenarios
                </h2>
                {scenariosExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {scenariosExpanded && (
                <div className="sc-scenarios-grid">
                  {SCENARIOS.map(s => (
                    <button
                      key={s.id}
                      className={`sc-scenario-card ${activeScenario === s.id ? 'sc-scenario-card--active' : ''}`}
                      onClick={() => { applyScenario(s); setScenariosExpanded(false); }}
                      type="button"
                      title={s.description}
                    >
                      <span className="sc-scenario-icon">{s.icon}</span>
                      <span className="sc-scenario-name">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Search + File Categories — the main input area */}
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <div className="sc-search-wrapper">
              <Search size={16} className="sc-search-icon" />
              <input
                type="text"
                className="sc-search-input"
                placeholder="Search file types (e.g. MRI, video, Excel)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="sc-search-clear" onClick={() => setSearchQuery('')} type="button">&times;</button>
              )}
            </div>
          </div>

          <div className="sc-categories">
            {filteredCategories.map(cat => {
              const isExpanded = expandedCategories.has(cat.id);
              const catHasInputs = cat.files.some(f => {
                if (f.id === 'custom-data') return customCount > 0;
                return (inputs[f.id] || 0) > 0;
              });

              return (
                <div key={cat.id} className={`sc-category ${catHasInputs ? 'sc-category--active' : ''}`}>
                  <button
                    className="sc-category-header"
                    onClick={() => toggleCategory(cat.id)}
                    type="button"
                  >
                    <span className="sc-category-icon">{cat.icon}</span>
                    <span className="sc-category-label">{cat.label}</span>
                    {cat.sensitive && <span className="sc-badge sc-badge--sensitive">Sensitive</span>}
                    {catHasInputs && <span className="sc-badge sc-badge--has-data">Has data</span>}
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isExpanded && (
                    <div className="sc-category-body">
                      {cat.files.map(file => renderFileInput(file, cat))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Settings — only shown when user has data (progressive disclosure) */}
          {hasAnyData && (
            <>
              {/* Project Settings */}
              <section className="sc-section">
                <h2 className="sc-section-title">
                  <Info size={16} /> Project Settings
                </h2>
                <div className="sc-setup-grid">
                  <div className="sc-setup-item">
                    <label className="sc-setup-label">Active Duration</label>
                    <div className="sc-slider-row">
                      <input type="range" className="sc-slider" min="1" max="10"
                        value={activeDuration} onChange={e => setActiveDuration(parseInt(e.target.value))} />
                      <span className="sc-slider-value">{activeDuration} yr{activeDuration !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="sc-setup-item">
                    <label className="sc-setup-label">Archival Duration</label>
                    <div className="sc-slider-row">
                      <input type="range" className="sc-slider" min="1" max="25"
                        value={archivalDuration} onChange={e => setArchivalDuration(parseInt(e.target.value))} />
                      <span className="sc-slider-value">{archivalDuration} yr{archivalDuration !== 1 ? 's' : ''}</span>
                    </div>
                    {archivalDuration < 7 && (
                      <p style={{ fontSize: 11, color: 'var(--accent-amber)', marginTop: 4, lineHeight: 1.4 }}>
                        Note: The LUFA Collective Agreement requires a minimum 7-year retention period after research completion. Specific funding or contract requirements may extend this.
                      </p>
                    )}
                  </div>
                  <div className="sc-setup-item sc-setup-item--full">
                    <label className="sc-checkbox-label">
                      <input type="checkbox" className="sc-checkbox" checked={indigenousData}
                        onChange={e => setIndigenousData(e.target.checked)} />
                      <span>This research involves Indigenous communities, peoples, or data</span>
                    </label>
                  </div>
                </div>
              </section>

              {/* Backup Strategy */}
              <section className="sc-section">
                <h2 className="sc-section-title">
                  <Shield size={16} /> Backup Strategy
                </h2>
                <div className="sc-backup-grid">
                  {BACKUP_STRATEGIES.map(b => (
                    <button
                      key={b.id}
                      className={`sc-backup-card ${selectedBackup === b.id ? 'sc-backup-card--active' : ''}`}
                      onClick={() => {
                        setSelectedBackup(b.id);
                        if (b.multiplier !== null) setMultiplier(b.multiplier);
                        else setMultiplier(customMultiplier);
                      }}
                      type="button"
                    >
                      <span className="sc-backup-icon">{b.icon}</span>
                      <span className="sc-backup-name">{b.label}</span>
                      {b.multiplier !== null && <span className="sc-backup-mult">{b.multiplier}x</span>}
                    </button>
                  ))}
                </div>
                {selectedBackup === 'custom' && (
                  <div className="sc-custom-mult">
                    <label className="sc-setup-label">Custom Multiplier</label>
                    <div className="sc-slider-row">
                      <input type="range" className="sc-slider" min="1" max="10" step="1"
                        value={customMultiplier}
                        onChange={e => { const v = parseInt(e.target.value); setCustomMultiplier(v); setMultiplier(v); }} />
                      <span className="sc-slider-value">{customMultiplier}x</span>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {/* Reset button — only when there's data */}
          {hasAnyData && (
            <button className="sc-reset-btn" onClick={resetAll} type="button">
              <RotateCcw size={16} /> Reset All
            </button>
          )}
        </div>

        {/* ---- RIGHT COLUMN (sticky) ---- */}
        <div className="sc-right">
          <div className="sc-sticky">
            {/* Summary Cards */}
            <div className="sc-summary-cards">
              <div className="sc-summary-card">
                <span className="sc-summary-label">Base Data</span>
                <span className="sc-summary-value">{formatSize(totalBaseMB / 1024)}</span>
              </div>
              <div className="sc-summary-card sc-summary-card--primary">
                <span className="sc-summary-label">Total Active ({multiplier}x)</span>
                <span className="sc-summary-value">{formatSize(totalActiveGB)}</span>
              </div>
              <div className="sc-summary-card">
                <span className="sc-summary-label">Archival (Base &times; 2)</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>Min. 7 yr per LUFA</span>
                <span className="sc-summary-value">{formatSize(totalArchivalGB)}</span>
              </div>
            </div>

            {/* Doughnut Chart */}
            {contributions.length > 0 && (
              <DoughnutChart contributions={contributions} totalLabel={formatSize(totalActiveGB)} />
            )}

            {/* Classification Badge */}
            <div className="sc-classification" style={{ borderColor: classColor }}>
              <Shield size={20} style={{ color: classColor }} />
              <div>
                <div className="sc-classification-level" style={{ color: classColor }}>{classificationLevel}</div>
                <ul className="sc-classification-reqs">
                  {classificationRequirements.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="sc-warnings">
                {warnings.map((w, i) => (
                  <div key={i} className={`sc-warning sc-warning--${w.level}`}>
                    <AlertTriangle size={16} />
                    <span>{w.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* What-If & Recommendations — moved below export, collapsed by default */}
            {(activeWhatIfs.length > 0 || activeRecommendations.length > 0) && (
              <details className="sc-details">
                <summary className="sc-details-summary">
                  Optimization Tips ({activeWhatIfs.length + activeRecommendations.length})
                </summary>
                {activeWhatIfs.length > 0 && (
                  <div className="sc-whatif" style={{ marginTop: 'var(--space-sm)' }}>
                    <h4 className="sc-whatif-title">What-If Scenarios</h4>
                    <div className="sc-whatif-cards">
                      {activeWhatIfs.map((t, i) => {
                        const baseGB = totalBaseMB / 1024;
                        const newBase = baseGB * t.factor;
                        const newActive = newBase * multiplier;
                        const diff = newActive - totalActiveGB;
                        return (
                          <div key={i} className="sc-whatif-card">
                            <div className="sc-whatif-name">{t.name}</div>
                            <div className="sc-whatif-result">
                              <span>{formatSize(newActive)}</span>
                              <span className={diff < 0 ? 'sc-whatif-savings' : 'sc-whatif-increase'}>
                                {diff < 0 ? '\u2193' : '\u2191'} {formatSize(Math.abs(diff))}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {activeRecommendations.length > 0 && (
                  <div className="sc-recommendations" style={{ marginTop: 'var(--space-sm)' }}>
                    <h4 className="sc-recommendations-title">Format Recommendations</h4>
                    {activeRecommendations.map((rec, i) => (
                      <div key={i} className="sc-rec-card">
                        <div className="sc-rec-row">
                          <span className="sc-rec-label">Current:</span>
                          <span>{rec.current}</span>
                        </div>
                        <div className="sc-rec-row">
                          <span className="sc-rec-label">Recommended:</span>
                          <span className="sc-rec-recommended">{rec.recommended}</span>
                        </div>
                        <div className="sc-rec-row">
                          <span className="sc-rec-label">Savings:</span>
                          <span className="sc-rec-savings">{rec.savings}</span>
                        </div>
                        <div className="sc-rec-note">{rec.note}</div>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            )}

            {/* Export Actions */}
            <div className="sc-export">
              <h3 className="sc-export-title">Export & Share</h3>
              <div className="sc-export-buttons">
                <button className="sc-export-btn sc-export-btn--primary" onClick={generateDMPText} type="button">
                  {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy DMP Text</>}
                </button>
                <button className="sc-export-btn" onClick={handlePrint} type="button">
                  <Printer size={16} /> Print
                </button>
                <button className="sc-export-btn" onClick={saveConfiguration} type="button">
                  <Link size={16} /> Share Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
