#include <stdio.h>
#include <string.h>

/* GLOBAL VARIABLES */
int account_number = 0;
int withdraw_count = 0;
int total_amount = 0;
int time_interval = 0;

int location_count = 0;
char locations[10][50];

/* UPDATE LOCATION */
void update_location(char *loc){
strcpy(locations[location_count++], loc);
}

/* FRAUD DETECTION (MATCHED WITH PARSER) */
void detect_fraud(){

```
int risk = 0;

// ----------------------
// 1. FREQUENCY
// ----------------------
if(withdraw_count == 2)
    risk += 2;
else if(withdraw_count >= 3)
    risk += 5;

// ----------------------
// 2. AMOUNT
// ----------------------
if(total_amount > 50000)
    risk += 2;
if(total_amount > 100000)
    risk += 4;

// ----------------------
// 3. LOCATION
// ----------------------
if(location_count > 1)
    risk += 3;

// ----------------------
// 4. TIME
// ----------------------
if(time_interval > 60 && time_interval <= 120)
    risk += 2;

if(time_interval <= 60)
    risk += 3;

// ----------------------
// 🔥 COMBO RULES
// ----------------------
if(withdraw_count >= 3 && total_amount > 100000)
    risk += 5;

if(location_count > 1 && time_interval <= 5)
    risk += 5;

// ----------------------
// RESULT
// ----------------------
char *level;
char *action;

if(risk <= 4){
    level = "LOW";
    action = "ACTIVE";
}
else if(risk <= 12){
    level = "MEDIUM";
    action = "TEMPORARY BLOCK (24h)";
}
else{
    level = "HIGH";
    action = "PERMANENT BLOCK";
}

printf("\n----- FRAUD ANALYSIS RESULT -----\n");

printf("Account: %d\n", account_number);
printf("Withdraw Count: %d\n", withdraw_count);
printf("Total Amount: %d\n", total_amount);
printf("Time Interval: %d\n", time_interval);
printf("Location Count: %d\n", location_count);

printf("Risk Score: %d\n", risk);
printf("Risk Level: %s\n", level);
printf("Action: %s\n", action);
```

}
