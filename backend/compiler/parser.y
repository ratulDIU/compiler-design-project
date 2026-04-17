%{
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int yylex(void);
void yyerror(const char *s);

/* variables */
int withdraw_count = 0;
int total_amount = 0;
int time_interval = 0;
int account_number = 0;

int location_count = 0;
char locations[10][50];

void detect_fraud();
void update_location(char *loc);

%}

%union{
    int num;
    char *str;
}

%token ACCOUNT LOCATION WITHDRAW TIME_INTERVAL ANALYZE
%token <num> NUMBER
%token <str> CITY

%%

program:
    statements ANALYZE { detect_fraud(); }
;

statements:
      statements statement
    | statement
;

statement:
      ACCOUNT NUMBER {
            account_number = $2;
        }

    | LOCATION CITY {
            update_location($2);
        }

    | WITHDRAW NUMBER {
            withdraw_count++;
            total_amount += $2;
        }

    | TIME_INTERVAL NUMBER {
            time_interval = $2;
        }
;

%%

void update_location(char *loc){
    strcpy(locations[location_count++], loc);
}

void detect_fraud(){

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
    // 4. TIME (FIXED)
    // ----------------------
    if(time_interval>60 && time_interval <= 120)
        risk += 2;
    if(time_interval <= 60)
        risk += 3;

    // ----------------------
    // 🔥 COMBO RULE
    // ----------------------
    if(withdraw_count >= 3 && total_amount > 100000)
        risk += 5;

    if(location_count > 1 && time_interval <= 5)
        risk += 5;

    // ----------------------
    // OUTPUT
    // ----------------------
    printf("\n--- FRAUD RESULT ---\n");
    printf("Account: %d\n", account_number);
    printf("Withdraw Count: %d\n", withdraw_count);
    printf("Total Amount: %d\n", total_amount);
    printf("Risk Score: %d\n", risk);

    if(risk <= 4){
        printf("Risk: LOW\n");
    }
    else if(risk <= 12){
        printf("Risk: MEDIUM\n");
    }
    else{
        printf("Risk: HIGH\n");
    }
}