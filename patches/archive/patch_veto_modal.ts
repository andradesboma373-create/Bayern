import fs from 'fs';

const modalCode = `import React, { useState, useEffect } from 'react';
import { X, Play } from 'lucide-react';
import { simulateMatchSeries, MAP_POOL_CS2, MAP_POOL_S2 } from '../lib/simulation';
import { getVetoStepsLocal } from '../Tournaments'; // Wait, let's just copy getVetoStepsLocal here.
// I will rewrite this file using string replace next.
`;
