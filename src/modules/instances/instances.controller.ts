/**
 * ThreeKingdoms-AgentEngine: Instance Management Controller
 * (src/modules/instances/instances.controller.ts)
 */

import { InstanceManagerService } from './instances.service';
import { CreateInstanceDTO, CloneInstanceDTO } from './instances.dto';

export class InstanceController {
  private service: InstanceManagerService;

  constructor() {
    this.service = InstanceManagerService.getInstance();
  }

  public listInstances(activeInstanceId?: string) {
    return {
      success: true,
      instances: this.service.listInstances(activeInstanceId)
    };
  }

  public createInstance(payload: CreateInstanceDTO) {
    const instance = this.service.createInstance(payload);
    return {
      success: true,
      instanceId: instance.id,
      instance,
      messageVi: `Khởi tạo thành công phiên chơi mới cho [${instance.name}] (${instance.archetypeNameVi})!`
    };
  }

  public cloneInstance(payload: CloneInstanceDTO) {
    const cloned = this.service.cloneInstance(payload);
    return {
      success: true,
      instanceId: cloned.id,
      instance: cloned,
      messageVi: `Đã nhân bản thành công nhánh chiến cục mới [${cloned.id}]!`
    };
  }

  public deleteInstance(instanceId: string) {
    const deleted = this.service.deleteInstance(instanceId);
    return {
      success: deleted,
      messageVi: deleted ? `Đã xóa hoàn toàn phiên chơi [${instanceId}].` : `Không tìm thấy phiên chơi để xóa.`
    };
  }
}
