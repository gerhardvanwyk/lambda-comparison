

class Line {
    id : string;
    data : number[]

    constructor(id? : string, data? : number[]) {
        this.id = id ?? "0";
        this.data = data ?? [1] ;
    }

    getId(){
        return this.id;
    }

    getData(){
        return this.data;
    }
}

export class EventModel {
    description : string;
    count : number;
    type : string;
    sort : string;
    lines : Line[];

    constructor(description?: string, count? : number, type? : string, sort? : string, lines? : Line[]) {
        this.description = description ?? 'Not Initialized';
        this.count = count ?? 1;
        this.type = type ?? 'Constant';
        this.sort = sort ?? 'bubble';
        this.lines = lines ?? [new Line()];
    }


    getDescription(){
        return this.description;
    }

    getCount(){
        return this.count;
    }

    getType(){
        return this.type;
    }

    getSort(){
        return this.sort;
    }

    getLines(){
        return this.lines;
    }
}


