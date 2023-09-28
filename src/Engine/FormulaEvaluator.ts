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

  /**

    7 tokens partial: "#ERR",
    8 tokens divideByZero: "#DIV/0!",
    9 tokens invalidCell: "#REF!",
  10 tokens invalidFormula: "#ERR",
  11 tokens invalidNumber: "#ERR",
  12 tokens invalidOperator: "#ERR",
  13 missingParentheses: "#ERR",
  0 tokens emptyFormula: "#EMPTY!",
    * 
   */

  evaluate(formula: FormulaType) {

    this._result = 0;
    this._errorMessage = "";

    //case 1: emptyFormula
    if (formula.length == 0) { 
      this._errorMessage = ErrorMessages.emptyFormula;
      return;
    }

    // switch (formula.length) {
    //   case 0:
    //     this._errorMessage = ErrorMessages.emptyFormula;
    //     break;
    //   case 7:
    //     this._errorMessage = ErrorMessages.partial;
    //     break;
    //   case 8:
    //     this._errorMessage = ErrorMessages.divideByZero;
    //     break;
    //   case 9:
    //     this._errorMessage = ErrorMessages.invalidCell;
    //     break;
    //   case 10:
    //     this._errorMessage = ErrorMessages.invalidFormula;
    //     break;
    //   case 11:
    //     this._errorMessage = ErrorMessages.invalidNumber;
    //     break;
    //   case 12:
    //     this._errorMessage = ErrorMessages.invalidOperator;
    //     break;
    //   case 13:
    //     this._errorMessage = ErrorMessages.missingParentheses;
    //     break;
    //   default:
    //     this._errorMessage = "";
    //     break;
    // }
    let ops = [];
    let nums = [];

    let cal_order_map = new Map<string, number>([
      ["+", 1],
      ["-", 1],
      ["*", 2],
      ["/", 2]
    ]);

    // nums.push(0); //if the first number is negative

    for (let i = 0; i < formula.length; i++) {
      let token = formula[i];

      //token could be number, operator or cell

      //token is number
      if (this.isNumber(token)) {
        nums.push(Number(token));

        //token is cell
      } else if (this.isCellReference(token)) {

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
          ops.push(token);
        } else if (token == ")") {
          while (ops.length > 0 && ops[ops.length - 1] !== "(") {
            this.calculate(nums, ops);
            if (this._errorMessage) {
              return;
            }
          }
          ops.pop(); //pop up the "("
        } else {
          while (ops.length > 0 && ops[ops.length - 1] !== "(") {
            let prevops = ops[ops.length - 1];
            if (cal_order_map.get(prevops)! >= cal_order_map.get(token)!) {
              this.calculate(nums, ops);
              if (this._errorMessage) {
                return;
              }
            } else {
              break;
            }
          }
          ops.push(token);
        }
      }
      
    }
    
    while (ops.length > 0) {
      if (nums.length < 2 && ops[ops.length - 1] !== "(" && ops[ops.length - 1] !== ")") {
        this._errorMessage = ErrorMessages.invalidFormula;
        return;
      }
      if (nums.length < 2 && (ops[ops.length - 1] == "(" || ops[ops.length - 1] !== ")")) {
        this._errorMessage = ErrorMessages.missingParentheses;
        return;
      }
      this.calculate(nums, ops);
    }

    this._result = nums[nums.length - 1];
  }

  public calculate(nums: number[], ops: string[]) {

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