import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;


  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }


  /*
  README:
  Please note that my code will accpet the "+" and "-" operators as the first token in formula. 
  This will allow the user to enter negative number and I believe this is the common way to implement calculator functions. 
  There is no test case for this situation and please assume that this is not an error when you test the code.
  */

  evaluate(formula: FormulaType) {

    this._result = 0;
    this._errorMessage = "";

    //case 1: emptyFormula: formula is empty
    if (formula.length == 0) { 
      this._errorMessage = ErrorMessages.emptyFormula;
      return;
    }

    //case 2: invalidFormula: formula is ending with operator
    if (["+", "-", "*", "/"].includes(formula[formula.length - 1])) {
      this._errorMessage = ErrorMessages.invalidFormula;
    }

    //case 3: invalidFormula: formula is starting with operator
    if (["*", "/"].includes(formula[0])) {
      this._errorMessage = ErrorMessages.invalidFormula;
    }

    let ops = [];
    let nums = [];

    let cal_order_map = new Map<string, number>([
      ["+", 1],
      ["-", 1],
      ["*", 2],
      ["/", 2]
    ]);

    nums.push(0); //if the first number is negative

    let prev_token = null;

    for (let i = 0; i < formula.length; i++) {
      let token = formula[i];

      //token could be number, operator or cell

      //token is number
      if (this.isNumber(token)) {

        //the previous token must be "+-*/" or "(" before a number token
        if (prev_token && (prev_token === ")" || this.isNumber(prev_token) || this.isCellReference(prev_token))) {
          this._result = nums[nums.length - 1];
          this._errorMessage = ErrorMessages.invalidFormula;
          return;
        }
        nums.push(Number(token));

        //token is cell
      } else if (this.isCellReference(token)) {

        //the previous token must be "+-*/" or "(" before a cell reference token
        if (prev_token && (prev_token === ")" || this.isNumber(prev_token) || this.isCellReference(prev_token))) {
          this._result = nums[nums.length - 1];
          this._errorMessage = ErrorMessages.invalidFormula;
          return;
        }

        let cell_value = this.getCellValue(token);

        //if the cell has error
        if (cell_value[1]) {
          this._errorMessage = cell_value[1];
          return;
        }

        nums.push(cell_value[0]);

        //token is operators
        //3 cases:
        //case 1: operator is "("
        //case 2: operator is ")"
        //case 3: opertator is in "+-*/"
      } else {
        if (token == "(") {
          //the previous token must be "+-*/" or "(" before a parenthesis
          if (prev_token && (prev_token === ")" || this.isNumber(prev_token) || this.isCellReference(prev_token))) {
            this._result = nums[nums.length - 1];
            this._errorMessage = ErrorMessages.invalidFormula;
            return;
          }
          ops.push(token);
        } else if (token == ")") {
          //the previous token must be a number token or cell reference or ")" before a parenthesis
          if (prev_token && ["+", "-", "*", "/"].includes(prev_token)) {
            this._result = nums[nums.length - 1];
            this._errorMessage = ErrorMessages.invalidFormula;
            return;
          }

          if (prev_token && prev_token === "(") {
            this._errorMessage = ErrorMessages.missingParentheses;
            this._result = nums[nums.length - 1];
            return;
          }

          while (ops.length > 0 && ops[ops.length - 1] !== "(") {
            this.calculate(nums, ops);
            if (this._errorMessage) {
              break;
            }
          }
          ops.pop(); //pop up the "("
        } else {

          //the previous token must be number token or cell reference or ")" before "+-*/" operator
          if (prev_token && ["+", "-", "*", "/", "("].includes(prev_token)) {
            this._result = nums[nums.length - 1];
            this._errorMessage = ErrorMessages.invalidFormula;
            return;
          }

          while (ops.length > 0 && ops[ops.length - 1] !== "(") {
            let prevops = ops[ops.length - 1];
            if (cal_order_map.get(prevops)! >= cal_order_map.get(token)!) {
              this.calculate(nums, ops);
              if (this._errorMessage) {
                break;
              }
            } else {
              break;
            }
          }
          ops.push(token);
        }
      }

      prev_token = token;
    }
    
    while (ops.length > 0) {
      this.calculate(nums, ops);
      if (this._errorMessage) {
        break;
      }
    }

    if (this._errorMessage != ErrorMessages.divideByZero) {
      this._result = nums[nums.length - 1];
    } else {
      this._result = Infinity;
    }

  }

    /**
   * This function will do calculation on nums array and ops array, and update the result on nums array
   * @param nums array
   * @param ops array
   * 
   */

  public calculate(nums: number[], ops: string[]) {

    if (nums.length == 0) {
      this._errorMessage = ErrorMessages.invalidFormula;
      return;
    }

    if (ops[ops.length - 1] == "(") {
      this._errorMessage = ErrorMessages.missingParentheses;
      return;
    }

    //if only one num in the stack, dont need to calculate
    if (nums.length < 2) {
      return;
    }

    //if no ops in the stack
    if (ops.length == 0) { 
      return;
    }

    let second_num = nums.pop()!;
    let first_num = nums.pop()!;
    let result = 0;

    let operator = ops.pop();

    switch (operator) { 
      case "+":
        result = first_num + second_num;
        break;
      case "-":
        result = first_num - second_num;
        break;
      case "*":
        result = first_num * second_num;
        break;
      case "/":
        if (second_num == 0) {
          this._errorMessage = ErrorMessages.divideByZero;
          break;
        } else {
          result = first_num / second_num;
        }
        break;
    }

    nums.push(result);
  }

  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }

  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;