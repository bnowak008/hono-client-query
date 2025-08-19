//===============//
// Error Handling //
//===============//

export class HonoQueryError extends Error {
  response: Response;
  data: any;

  constructor(res: Response, data: any) {
    super(data?.message || res.statusText);
    this.name = 'HonoQueryError';
    this.response = res;
    this.data = data;
  }
}
