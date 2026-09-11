import React from 'react';
import { Icon } from '@chakra-ui/react';
import {
  MdCable,
  MdDevices,
  MdHome,
} from 'react-icons/md';

// Admin Views
import MainDashboard from 'views/admin/default';
import RoomVisualizerView from 'views/admin/room';
import DeviceLibraryView from 'views/admin/deviceLibrary';

const routes = [
  {
    name: 'Main Dashboard',
    layout: '/admin',
    path: '/default',
    icon: <Icon as={MdHome} width="20px" height="20px" color="inherit" />,
    component: <MainDashboard />,
  },
  {
    name: 'Rack & Cable Canvas',
    layout: '/admin',
    path: '/rack-room',
    icon: <Icon as={MdCable} width="20px" height="20px" color="inherit" />,
    component: <RoomVisualizerView />,
  },
  {
    name: 'Device Library',
    layout: '/admin',
    path: '/device-library',
    icon: <Icon as={MdDevices} width="20px" height="20px" color="inherit" />,
    component: <DeviceLibraryView />,
  },
];

export default routes;
