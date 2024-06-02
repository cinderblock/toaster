import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import { LineChart, Line, XAxis, YAxis, Label, ResponsiveContainer, LineProps } from 'recharts';
import Title from './Title';
import { useServerStateHistory } from './state';

// Generate Sales Data
function createData(time: string, amount?: number) {
  return { time, amount };
}

const sharedLineOptions: Omit<LineProps, 'ref'> = {
  type: 'monotone',
  dot: false,
  isAnimationActive: false,
  // strokeWidth: 2,
  // activeDot: {
  //   r: 8,
  // },
};

export default function Chart() {
  const theme = useTheme();

  return (
    <React.Fragment>
      <Title>Profile</Title>
      <ResponsiveContainer>
        <LineChart
          data={useServerStateHistory()}
          margin={{
            top: 16,
            right: 16,
            bottom: 0,
            left: 24,
          }}
        >
          <XAxis dataKey="realTime" stroke={theme.palette.text.secondary} style={theme.typography.body2} />

          <YAxis yAxisId="temp" stroke={theme.palette.text.secondary} style={theme.typography.body2}>
            <Label
              angle={270}
              position="right"
              style={{
                textAnchor: 'middle',
                fill: theme.palette.text.primary,
                ...theme.typography.body1,
              }}
            >
              Temp (°C)
            </Label>
          </YAxis>

          <YAxis yAxisId="state" stroke={theme.palette.text.secondary} style={theme.typography.body2}>
            {/* <Label
              angle={270}
              position="left"
              style={{
                textAnchor: 'middle',
                fill: theme.palette.text.primary,
                ...theme.typography.body1,
              }}
            >
              State
            </Label> */}
          </YAxis>

          <Line {...sharedLineOptions} yAxisId="temp" dataKey="temp0" stroke={theme.palette.primary.main} />
          <Line {...sharedLineOptions} yAxisId="temp" dataKey="temp1" stroke={theme.palette.primary.main} />
          <Line {...sharedLineOptions} yAxisId="temp" dataKey="temp2" stroke={theme.palette.primary.main} />
          <Line {...sharedLineOptions} yAxisId="temp" dataKey="temp3" stroke={theme.palette.primary.main} />
          <Line {...sharedLineOptions} yAxisId="temp" dataKey="set" stroke={theme.palette.primary.light} />
          <Line
            {...sharedLineOptions}
            yAxisId="temp"
            dataKey="actual"
            stroke={theme.palette.primary.main}
            fill={theme.palette.primary.main}
          />
          <Line {...sharedLineOptions} yAxisId="temp" dataKey="coldJ" stroke={theme.palette.primary.light} />

          <Line {...sharedLineOptions} yAxisId="state" dataKey="heat" fill={theme.palette.primary.main} />
          <Line {...sharedLineOptions} yAxisId="state" dataKey="fan" fill={theme.palette.primary.main} />

          {/* <Line {...sharedLineOptions} yAxisId="state" dataKey="mode" fill={theme.palette.primary.main} /> */}
        </LineChart>
      </ResponsiveContainer>
    </React.Fragment>
  );
}
