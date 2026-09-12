export interface RawManualSeed {
  documentName: string;
  brand: string;
  model: string;
  sections: Array<{
    pageNumber: number;
    sectionTitle: string;
    text: string;
  }>;
}

export const SEED_MANUALS: RawManualSeed[] = [
  {
    documentName: 'Carrier 59MN7A Condensing Gas Furnace Service Manual',
    brand: 'Carrier',
    model: '59MN7A',
    sections: [
      {
        pageNumber: 12,
        sectionTitle: 'Safety Warnings & Electrical Disconnect Isolation',
        text: `WARNING: ELECTRICAL SHOCK HAZARD. Failure to follow this warning could result in personal injury or death. Turn off the main electrical supply switch to the furnace before performing any maintenance, diagnostics, or switch adjustments. Verify absence of voltage with a calibrated CAT III multimeter across L1 and Neutral, and L1 to ground before opening the control compartment blower door. Ensure proper 120VAC line polarity; reversed polarity prevents flame rectification microamp signal sensing and triggers continuous lockout.`,
      },
      {
        pageNumber: 27,
        sectionTitle: 'Troubleshooting Fault Code 33: Limit Switch / Flame Rollout Circuit Open',
        text: `FAULT CODE 33: LIMIT CIRCUIT FAULT (Rapid 3 Amber flashes, then 3 slow Amber flashes).
Indicates the primary limit switch or flame rollout switch has tripped open.
Diagnostic Procedure:
1. Disconnect power and verify air filter condition. An air filter loaded with dust or debris restricts airflow across the primary heat exchanger, causing plenum temperature to exceed the 170°F (77°C) limit switch rating.
2. Check all return air grilles and supply registers to ensure a minimum of 80% are fully open and unblocked.
3. Inspect the secondary heat exchanger face and air-conditioning evaporator coil for pet hair, lint, or particulate fouling.
4. Using an inclined manometer or digital differential manometer, measure Total External Static Pressure (TESP) between the return drop (before blower) and the supply plenum (above heat exchanger). If TESP exceeds 0.80 in. w.c. (200 Pa), airflow is insufficient.
5. If airflow and static pressure are normal, measure DC voltage drop across the primary limit switch terminals while in high-fire. A closed switch will register < 0.1 VDC. If switch remains open when supply plenum temperature drops below 130°F (54°C), replace the primary limit switch.`,
      },
      {
        pageNumber: 42,
        sectionTitle: 'Table 8: SW1 Setup DIP Switch Configuration & Continuous Fan Airflow',
        text: `TABLE 8 - SW1 SETUP SWITCH CONFIGURATION (Microprocessor Control Board HK42FZ022):
SW1-1 and SW1-2: Continuous Fan Airflow Selection (CFM):
- SW1-1 OFF, SW1-2 OFF: Low Continuous Airflow (approx 30% of cooling CFM, nominal 350 CFM for 3-ton models). Recommended for continuous filtration.
- SW1-1 ON, SW1-2 OFF: Medium-Low Airflow (approx 50% of cooling CFM, nominal 600 CFM).
- SW1-1 OFF, SW1-2 ON: Medium Airflow (approx 70% of cooling CFM, nominal 850 CFM).
- SW1-1 ON, SW1-2 ON: High Continuous Airflow (approx 100% of cooling CFM, nominal 1200 CFM).
SW1-3: Cooling Blower-Off Delay:
- SW1-3 OFF: Standard 90-second blower off-delay after thermostat cooling call ends.
- SW1-3 ON: Extended 120-second blower off-delay for enhanced seasonal SEER efficiency.
SW1-4: Heating Airflow Trim (+/- 7%):
- SW1-4 OFF: Nominal factory heating airflow.
- SW1-4 ON: +7% increased heating airflow for elevated static duct installations.`,
      },
      {
        pageNumber: 48,
        sectionTitle: 'Inducer Draft Pressure Switch Diagnostics & Condensate Drainage',
        text: `INDUCER DRAFT PRESSURE SWITCH & CONDENSATE TRAP INSPECTION (Fig. 31):
Fault Code 31 indicates the pressure switch failed to close after the inducer motor energized, or opened during heating cycle.
1. Inspect the clear vinyl tubing between the draft inducer housing and the pressure switch transducer for water droplets, kinks, or cracks. Remove tubing and clear moisture with compressed air.
2. Check the internal condensate trap on the left or right casing wall. A blocked or unprimed condensate trap causes water to back up into the secondary heat exchanger header box, restricting inducer suction. Remove the cleanout plug and flush the trap with clean water until drainage flows freely to the floor drain.
3. Attach a tee fitting and digital manometer in line with the pressure switch port. Run the inducer motor: differential pressure must exceed -0.65 in. w.c. for high-fire switch and -0.42 in. w.c. for low-fire switch. If measured draft is adequate but electrical contacts remain open, replace the pressure switch assembly.`,
      },
      {
        pageNumber: 64,
        sectionTitle: 'Flame Rectification Sensor & Burner Orifice Maintenance',
        text: `FLAME SENSING CIRCUIT & BURNER MANIFOLD:
Fault Code 14 indicates ignition lockout due to 3 consecutive failed flame sensing attempts.
1. Remove the single 1/4" hex screw securing the flame sensor bracket to the left burner wing.
2. Inspect the sensor rod for silicon dioxide or carbon contamination. Clean gently using non-scratch abrasive steel wool or fine emery cloth. Do not use sandpaper.
3. Connect a digital multimeter configured for DC microamps (µA) in series with the flame sensor lead wire.
4. Initiate a call for heat (W1 terminal). During steady ignition, normal flame rectification signal must measure between 2.0 and 6.0 µA DC. If signal is below 0.8 µA DC, verify burner ground connection and inspect burner orifice for spider webs or oxidation.`,
      },
    ],
  },
  {
    documentName: 'Trane XR14 & XR16 Split-System Heat Pump Diagnostics Manual',
    brand: 'Trane',
    model: 'XR14',
    sections: [
      {
        pageNumber: 18,
        sectionTitle: 'Defrost Control Board D-14 Force Test Procedure',
        text: `DEFROST CONTROL BOARD (CNT04374) FORCE DEFROST TESTING:
The electronic defrost control board uses outdoor coil temperature and compressor run time (selectable 30, 60, or 90 minutes) to determine defrost initiation.
To initiate a forced defrost cycle for diagnosis:
1. Ensure the heat pump is operating in heating mode with the compressor running.
2. Locate the two metal TEST pins on the defrost control board adjacent to the field wiring terminal strip.
3. Using an insulated screwdriver or jumper wire, short the two TEST pins together for 5 consecutive seconds.
4. The control board will immediately accelerate timer counting: the reversing valve solenoid will energize (reversing into cooling mode), the outdoor fan motor relay will open to stop outdoor fan operation, and 24VAC will be sent from terminal W1/X2 to energize supplemental indoor electric heat strips.
5. If the outdoor coil temperature sensor is warmer than 35°F (1.7°C), the board will terminate defrost after approximately 10 seconds. To test a full 14-minute cycle, temporarily disconnect the outdoor coil thermistor or chill it below 30°F using component freeze spray.`,
      },
      {
        pageNumber: 22,
        sectionTitle: 'Table 6: Outdoor Ambient & Coil Thermistor Resistance Chart',
        text: `TABLE 6 - 10K NTC THERMISTOR RESISTANCE VALUES (Coil Sensor & Ambient Sensor):
When diagnosing erratic defrost cycles or false coil freeze warnings, measure thermistor resistance with sensor unplugged from control board:
- Temperature 20°F (-6.7°C): Resistance = 46.2 kΩ (+/- 3%)
- Temperature 30°F (-1.1°C): Resistance = 34.5 kΩ
- Temperature 32°F (0.0°C): Resistance = 32.6 kΩ
- Temperature 40°F (4.4°C): Resistance = 26.1 kΩ
- Temperature 50°F (10.0°C): Resistance = 19.9 kΩ
- Temperature 60°F (15.6°C): Resistance = 15.3 kΩ
- Temperature 70°F (21.1°C): Resistance = 11.9 kΩ
- Temperature 77°F (25.0°C): Resistance = 10.0 kΩ (Reference Calibration Point)
- Temperature 90°F (32.2°C): Resistance = 7.3 kΩ
- Temperature 100°F (37.8°C): Resistance = 5.8 kΩ
If measured resistance deviates more than 10% from the table value at measured surface temperature, replace the thermistor assembly.`,
      },
      {
        pageNumber: 31,
        sectionTitle: 'Reversing Valve Operation & Electrical Solenoid Diagnostics',
        text: `REVERSING VALVE DIAGNOSTICS & HEAT/COOL SWITCHING:
The Trane XR14/XR16 reversing valve solenoid is energized in COOLING mode and de-energized in HEATING mode (O terminal logic).
Diagnostic Steps:
1. Check 24VAC across terminal 'O' and terminal 'B/C' at the outdoor unit low-voltage strip.
   - During a cooling call (Y + O energized): Voltage must measure 20 to 28 VAC. Solenoid should click and draw approximately 0.2 to 0.4 Amps.
   - During a heating call (Y only): Voltage must measure 0 VAC.
2. If 24VAC is present at solenoid coil but valve does not shift: disconnect coil lead and check solenoid coil resistance. Normal coil resistance is 60 to 80 ohms. If open circuit, replace solenoid coil (VAL08592).
3. If solenoid operates but system fails to heat or cool properly (internal bypass leak): measure copper tube temperatures across the 4-way valve. If the middle suction tube from the indoor coil is warm in heating mode, or temperature difference across the discharge and suction tubes is less than 30°F, the internal slide valve is hung up or leaking.`,
      },
      {
        pageNumber: 39,
        sectionTitle: 'Refrigerant Subcooling Charging Chart for R-410A Systems',
        text: `SUBCOOLING CHARGING METHOD (R-410A WITH THERMOSTATIC EXPANSION VALVE):
Subcooling charging must be performed with outdoor ambient temperature above 65°F (18°C) in Cooling Mode.
1. Operate unit for minimum 15 minutes to stabilize system refrigerant pressures.
2. Attach digital manifold gauge to the liquid line service port and attach an insulated thermocouple pipe clamp within 6 inches of the service valve.
3. Determine saturated liquid temperature corresponding to liquid line pressure from the R-410A pressure-temperature table.
4. Subtract measured liquid line surface temperature from saturated temperature to obtain Subcooling (Subcooling = Sat Temp - Liquid Line Temp).
5. Target subcooling for XR14 systems is 10°F (+/- 1°F). If subcooling is below 8°F, add R-410A liquid into suction service port in 2-ounce increments. If subcooling is above 12°F, recover refrigerant.`,
      },
    ],
  },
  {
    documentName: 'Copeland Scroll ZP Commercial Compressor Application Guide',
    brand: 'Copeland',
    model: 'ZP-Scroll',
    sections: [
      {
        pageNumber: 8,
        sectionTitle: 'Internal Pressure Relief (IPR) Valve Characteristics & Diagnosis',
        text: `INTERNAL PRESSURE RELIEF (IPR) VALVE:
Copeland Scroll ZP20K through ZP54K models incorporate an internal pressure relief valve located between the high-pressure discharge port and the low-pressure suction shell.
1. The IPR valve is designed to open when the differential pressure between discharge and suction reaches 550 to 625 psid (38 to 43 bar).
2. Typical Symptoms of an Open IPR Valve:
   - High-side discharge pressure drops significantly below normal condensing pressure.
   - Low-side suction pressure rises rapidly toward discharge pressure.
   - Compressor sound level changes to a distinctive high-pitched hissing or buzzing noise.
   - Motor current (amperage) rises close to locked rotor amps (LRA) due to high bypass gas temperature entering the scroll motor cavity.
   - The compressor internal line-break thermal motor protector will trip within 1 to 3 minutes.
3. CAUTION: Do not condemn the compressor when IPR valve trips. Check outdoor fan motor failure, blocked condenser coil, closed discharge shutoff service valve, or non-condensibles in system.`,
      },
      {
        pageNumber: 14,
        sectionTitle: 'Table 3: Discharge Line Temperature Limit & Thermostat Protection',
        text: `DISCHARGE LINE THERMOSTAT (DLT) & THERMAL PROTECTION (Table 3):
Scroll compressor reliability requires that discharge gas temperature remain below critical oil breakdown limits:
1. Maximum internal discharge temperature must not exceed 280°F (138°C).
2. The external discharge line thermostat (DLT) or sensor must be clamped firmly to the discharge copper line within 5 inches (127 mm) of the compressor discharge fitting and covered with thermal insulation.
3. The DLT sensor cutoff threshold is calibrated to 225°F +/- 5°F (107°C) surface temperature.
4. Causes of High Discharge Temperature Trips:
   - Low suction pressure resulting in high compression ratio (ratio > 10:1).
   - High suction superheat (> 20°F at compressor inlet) caused by undercharge or faulty expansion valve.
   - Severe restriction in liquid line filter-drier or moisture contamination.
   - Excessive superheated return gas causing motor overheating.`,
      },
      {
        pageNumber: 29,
        sectionTitle: 'Motor Winding Resistance & Electrical Megohmmeter Ground Testing',
        text: `MOTOR WINDING RESISTANCE & INSULATION INTEGRITY TEST:
WARNING: Ensure power is locked out at main panel. Discharge all run capacitors with a 20k ohm 10W resistor before touching terminals.
1. Remove compressor terminal cover. Disconnect all wires from terminals labeled C (Common), S (Start), and R (Run).
2. Using a calibrated digital ohmmeter (0.01 ohm resolution):
   - Measure resistance across Common to Run (R_CR).
   - Measure resistance across Common to Start (R_CS).
   - Measure resistance across Start to Run (R_SR).
   - Validation Formula: Resistance(C-R) + Resistance(C-S) must equal Resistance(S-R) within +/- 0.05 ohms.
   - For 3-Phase Scroll Models: All three phase-to-phase measurements (T1-T2, T2-T3, T1-T3) must be identical within 2%.
3. Megohmmeter Insulation Test: Connect one lead to copper suction stub (clean bare metal ground) and other lead to terminal C. Apply 500 VDC test voltage.
   - New or dry compressor: > 20 Megohms.
   - Acceptable field threshold: > 2 Megohms.
   - If resistance is < 0.5 Megohms, moisture or acid breakdown has compromised stator winding insulation.`,
      },
      {
        pageNumber: 34,
        sectionTitle: 'Polyolester (POE) Oil Moisture Limits & Acid Clean-Up Post-Burnout',
        text: `POE LUBRICANT HANDLING & COMPRESSOR BURNOUT CLEAN-UP:
Copeland ZP Scroll compressors use synthetic Polyolester (POE) oil (Copeland Ultra 22 CC or Mobil EAL Arctic 22 CC).
1. POE oil is rapidly hygroscopic and will chemically absorb moisture from atmospheric air within 15 minutes of exposure, forming carboxylic acid and alcohol.
2. Never leave system piping open to the atmosphere.
3. Maximum allowable moisture in operating POE system is 50 ppm.
4. Post-Burnout Clean-Up Protocol:
   - If total acid test of oil sample indicates high acidity (TAN > 0.10 mg KOH/g):
   - Install a temporary high-capacity burn-out suction line filter-drier (activated alumina and molecular sieve core) with pressure test access ports.
   - Evacuate system with dual-stage vacuum pump to below 500 microns; perform 15-minute standing vacuum decay test (decay must not exceed 250 microns).
   - Replace suction filter-drier after 48 hours of run time if pressure drop exceeds 3.0 psi.`,
      },
    ],
  },
];
