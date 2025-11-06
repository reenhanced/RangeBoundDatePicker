import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { RangeBoundDatePickerView, IRangeBoundDatePickerViewProps } from "./RangeBoundDatePickerView";
import * as React from "react";

export class RangeBoundDatePicker implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged!: () => void;

    private _minDate:Date =new Date();
    private _maxDate:Date=new Date();

    private _selectedDate!:Date;
    private _newSelectedDate: Date | null = null;
    private _uniqueKey!:string;
    private _allowTextInput!:boolean;
    private _showMonthPickerAsOverlay!:boolean;
    private _showWeekNumbers!:boolean;
    private _isRequired!:boolean;
    private _disableDays:number[]=[];
    private _restrictedDates:Date[]=[];
    private _isDisable!:boolean;
    private _firstDayOfWeek = 0;

    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
     * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
     * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
     */
    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
        this.synchronizeContext(context);
    }

    private disabledDatesParse (listDates:string){
        try {
            if(!listDates) return [];

            const dates: Date[] =  listDates.split(',').map(dateStr => dateStr.trim()).filter(dateStr => dateStr.length == 10)
            .map(dateStr => new Date(dateStr)).filter(date => !isNaN(date.getTime()));

            return dates;

        } catch (error) {
            console.log("[RangeBoundDatePicker] disabledDatesParse error", { listDates, error });
            return [];
        }
    }

    private dateConverter(date: string | undefined | null, duration = "" ): Date | null {
        try {
            if(!date){
                console.log("[RangeBoundDatePicker] dateConverter received empty value", { duration });
                return null;
            }
            if(duration === ""){
                const parsed = new Date(date);
                if (isNaN(parsed.getTime())) {
                    console.log("[RangeBoundDatePicker] dateConverter produced invalid Date", { date, duration });
                    return null;
                }
                return parsed;
            }

            const durationParts = date.split('.').map(part => part.trim()).filter(part => part.length > 0);
            if(durationParts.length !== 3 && durationParts.length !== 4){
                console.log("[RangeBoundDatePicker] dateConverter unsupported duration format", { date, duration });
                return null;
            }

            const years = this.isValidNumber(durationParts[0]) ? Number(durationParts[0]) : 0;
            let months = 0;
            let weeks = 0;
            let days = 0;

            if(durationParts.length === 4){
                months = this.isValidNumber(durationParts[1]) ? Number(durationParts[1]) : 0;
                weeks = this.isValidNumber(durationParts[2]) ? Number(durationParts[2]) : 0;
                days = this.isValidNumber(durationParts[3]) ? Number(durationParts[3]) : 0;
            } else {
                months = this.isValidNumber(durationParts[1]) ? Number(durationParts[1]) : 0;
                days = this.isValidNumber(durationParts[2]) ? Number(durationParts[2]) : 0;
            }

            const adjusted = new Date();
            adjusted.setHours(0, 0, 0, 0);

            const weekCount = weeks > 0 ? Math.floor(weeks) : 0;

            if(duration === "future"){
                adjusted.setFullYear(adjusted.getFullYear() + years);
                adjusted.setMonth(adjusted.getMonth() + months);
                if(weekCount > 0){
                    const normalizedDay = this.normalizeDayOfWeek(adjusted.getDay());
                    const daysToEndOfWeek = 6 - normalizedDay;
                    adjusted.setDate(adjusted.getDate() + daysToEndOfWeek + ((weekCount - 1) * 7));
                }
                adjusted.setDate(adjusted.getDate() + days);
            }
            else if(duration === "past"){
                adjusted.setFullYear(adjusted.getFullYear() - years);
                adjusted.setMonth(adjusted.getMonth() - months);
                if(weekCount > 0){
                    const normalizedDay = this.normalizeDayOfWeek(adjusted.getDay());
                    adjusted.setDate(adjusted.getDate() - normalizedDay - ((weekCount - 1) * 7));
                }
                adjusted.setDate(adjusted.getDate() - days);
            }
            return adjusted;
        } catch (error) {
            console.log("[RangeBoundDatePicker] failed to convert date", { date, duration, error });
            return null;
        }
    }

    private isValidNumber(value: string): boolean {
        const num = Number(value);
        return !isNaN(num) && isFinite(num);
    }

    private normalizeDayOfWeek(day: number): number {
        const normalized = (day - this._firstDayOfWeek) % 7;
        return normalized < 0 ? normalized + 7 : normalized;
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     * @returns ReactElement root react element for the control
     */
    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        this.synchronizeContext(context);
        const props: IRangeBoundDatePickerViewProps = {
            minDate: this._minDate,
            maxDate: this._maxDate,
            selectedDate: this._selectedDate,
            onSelectDate: this.onDateSelectChange,
            uniqueKey: this._uniqueKey,
            allowTextInput: this._allowTextInput,
            showMonthPickerAsOverlay: this._showMonthPickerAsOverlay,
            showWeekNumbers: this._showWeekNumbers,
            isRequired: this._isRequired,
            disableDays: this._disableDays,
            restrictedDates: this._restrictedDates,
            isDisable: this._isDisable
        };
        return React.createElement(
            RangeBoundDatePickerView, props
        );
    }

    private onDateSelectChange = (newValue: Date | null | undefined) => {
        this._newSelectedDate = newValue ?? null;
        this.notifyOutputChanged();
    };

    private synchronizeContext(context: ComponentFramework.Context<IInputs>): void {
        const parameters = context.parameters;

        const rawValues = {
            dateRangeSelector: parameters.dateRangeSelector.raw,
            minDate: parameters.minDate.raw,
            maxDate: parameters.maxDate.raw,
            pastTimeFrame: parameters.pastTimeFrame.raw,
            futureTimeFrame: parameters.futureTimeFrame.raw,
            disableDays: parameters.disableDays.raw,
            disabledDates: parameters.disabledDates.raw,
            allowTextInput: parameters.allowTextInput.raw,
            showMonthPickerAsOverlay: parameters.showMonthPickerAsOverlay.raw,
            showWeekNumbers: parameters.showWeekNumbers.raw,
            isRequired: parameters.isRequired.raw,
            selectedDate: parameters.DateAndTime.raw,
            isControlDisabled: context.mode.isControlDisabled
        };
        console.log("[RangeBoundDatePicker] synchronizeContext inputs", rawValues);

        const userSettings = context.userSettings as unknown as {
            dateFormattingInfo?: { weekStartDay?: number };
            weekStartDay?: number;
        };
        const weekStartCandidate = userSettings?.dateFormattingInfo?.weekStartDay ?? userSettings?.weekStartDay;
        if (typeof weekStartCandidate === "number" && weekStartCandidate >= 0 && weekStartCandidate <= 6) {
            this._firstDayOfWeek = weekStartCandidate;
        }

        this._uniqueKey = parameters.DateAndTime.attributes?.LogicalName ?? this._uniqueKey ?? "";
        this._selectedDate = parameters.DateAndTime.raw ?? this._selectedDate ?? new Date();

        const selector = parameters.dateRangeSelector.raw;
        if (selector === "0") {
            const minCandidate = this.dateConverter(parameters.minDate.raw);
            const maxCandidate = this.dateConverter(parameters.maxDate.raw);
            this._minDate = minCandidate ?? this._minDate;
            this._maxDate = maxCandidate ?? this._maxDate;
        } else if (selector === "1") {
            const minCandidate = this.dateConverter(parameters.pastTimeFrame.raw, "past");
            const maxCandidate = this.dateConverter(parameters.futureTimeFrame.raw, "future");
            this._minDate = minCandidate ?? this._minDate;
            this._maxDate = maxCandidate ?? this._maxDate;
        } else {
            console.log("[RangeBoundDatePicker] unknown dateRangeSelector value, resetting bounds", { selector });
            this._minDate = new Date();
            this._maxDate = new Date();
        }

        switch (parameters.disableDays.raw) {
            case "6":
                this._disableDays = [6];
                break;
            case "0":
                this._disableDays = [0];
                break;
            case "7":
                this._disableDays = [0, 6];
                break;
            default:
                this._disableDays = [];
        }

        this._allowTextInput = parameters.allowTextInput.raw ?? false;
        this._showMonthPickerAsOverlay = parameters.showMonthPickerAsOverlay.raw ?? false;
        this._showWeekNumbers = parameters.showWeekNumbers.raw ?? false;
        this._isRequired = parameters.isRequired.raw ?? false;
        this._restrictedDates = this.disabledDatesParse(parameters.disabledDates.raw ?? "");
        this._isDisable = context.mode.isControlDisabled;

        console.log("[RangeBoundDatePicker] computed state", {
            minDate: this._minDate,
            maxDate: this._maxDate,
            disableDays: this._disableDays,
            restrictedDates: this._restrictedDates,
            allowTextInput: this._allowTextInput,
            showMonthPickerAsOverlay: this._showMonthPickerAsOverlay,
            showWeekNumbers: this._showWeekNumbers,
            isRequired: this._isRequired,
            isDisable: this._isDisable,
            firstDayOfWeek: this._firstDayOfWeek
        });
    }

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
     */
    public getOutputs(): IOutputs {
        return {
            DateAndTime: this._newSelectedDate ?? undefined
        };
    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote calls, removing listeners, etc.
     */
    public destroy(): void {
        // Add code to cleanup control if necessary
    }
}
